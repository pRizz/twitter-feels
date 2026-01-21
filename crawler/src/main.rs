//! Twitter Feels Crawler
//!
//! A Rust-based crawler that fetches tweets from Twitter/X and analyzes
//! them for sentiment using configurable LLM models.

mod config;
mod db;
mod error;
mod models;
mod rate_limit;
mod twitter_api;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use chrono::{Duration, Utc};
use tokio::sync::{Mutex, Notify};
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use db::{ApiErrorDetail, Database};
use error::CrawlerError;
use models::TwitterApiError;
use rate_limit::build_rate_limiter;
use twitter_api::TwitterApiClient;

/// Application state for singleton pattern
struct AppState {
    is_running: bool,
}

impl AppState {
    fn new() -> Self {
        Self { is_running: false }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "twitter_feels_crawler=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Twitter Feels Crawler starting...");

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    info!("Configuration loaded:");
    info!("  Database: {}", config.database_url);
    info!("  Crawl interval: {} hours", config.crawl_interval_hours);
    info!("  History depth: {} days", config.history_depth_days);

    // Initialize state with singleton pattern
    let state = Arc::new(Mutex::new(AppState::new()));
    let shutdown = Arc::new(AtomicBool::new(false));
    let shutdown_notify = Arc::new(Notify::new());

    {
        let shutdown = shutdown.clone();
        let shutdown_notify = shutdown_notify.clone();
        tokio::spawn(async move {
            if tokio::signal::ctrl_c().await.is_ok() {
                shutdown.store(true, Ordering::SeqCst);
                shutdown_notify.notify_waiters();
            }
        });
    }

    // Main crawler loop
    loop {
        if shutdown.load(Ordering::SeqCst) {
            info!("Shutdown requested, stopping crawler loop.");
            break;
        }

        {
            let mut state_guard = state.lock().await;
            if state_guard.is_running {
                warn!("Crawler already running, skipping this cycle");
            } else {
                state_guard.is_running = true;
                drop(state_guard);

                // Run crawler
                if let Err(e) = run_crawl_cycle(&config, &shutdown).await {
                    warn!("Crawl cycle failed: {}", e);
                }

                // Mark as not running
                let mut state_guard = state.lock().await;
                state_guard.is_running = false;
            }
        }

        if shutdown.load(Ordering::SeqCst) {
            info!("Shutdown requested, skipping sleep.");
            break;
        }

        // Wait for next cycle
        info!(
            "Waiting {} hours until next crawl cycle...",
            config.crawl_interval_hours
        );
        tokio::select! {
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(
                config.crawl_interval_hours as u64 * 3600,
            )) => {}
            _ = shutdown_notify.notified() => {
                info!("Shutdown requested, stopping crawler loop.");
                break;
            }
        }
    }

    Ok(())
}

async fn run_crawl_cycle(config: &Config, shutdown: &AtomicBool) -> anyhow::Result<()> {
    info!("Starting crawl cycle...");

    let database = Database::new(&config.database_url)?;
    database.init_schema()?;

    let run_id = database.create_crawler_run()?;
    let mut error_details: Vec<ApiErrorDetail> = Vec::new();
    let mut tweets_fetched = 0_u64;
    let mut tweets_queued = 0_u64;
    let mut status = "completed";

    let rate_limiter = build_rate_limiter(config.rate_limit_per_15min)?;
    let twitter_client = TwitterApiClient::new(config.twitter_bearer_token.clone(), rate_limiter)?;

    let cycle_result = perform_crawl(
        &database,
        &twitter_client,
        config,
        shutdown,
        &mut error_details,
        &mut tweets_fetched,
        &mut tweets_queued,
        &mut status,
    )
    .await;

    if let Err(error) = cycle_result {
        status = "failed";
        record_error(
            &database,
            &mut error_details,
            error_kind(&error),
            format!("Crawler cycle error: {error}"),
            None,
            None,
        );
    }

    database.complete_crawler_run(
        run_id,
        status,
        tweets_fetched,
        tweets_queued,
        &error_details,
    )?;

    if let Err(error) = cycle_result {
        return Err(error.into());
    }

    Ok(())
}

async fn perform_crawl(
    database: &Database,
    twitter_client: &TwitterApiClient,
    config: &Config,
    shutdown: &AtomicBool,
    error_details: &mut Vec<ApiErrorDetail>,
    tweets_fetched: &mut u64,
    tweets_queued: &mut u64,
    status: &mut &str,
) -> Result<(), CrawlerError> {
    let enabled_models = database.get_enabled_model_ids()?;
    process_reanalysis_requests(database, &enabled_models, shutdown, error_details)?;

    let active_users = database.load_active_users()?;
    if active_users.is_empty() {
        info!("No active users to crawl.");
        return Ok(());
    }

    let usernames: Vec<String> = active_users
        .iter()
        .map(|user| user.username.clone())
        .collect();

    let users_response = twitter_client.fetch_users_by_usernames(&usernames).await?;
    if let Some(errors) = users_response.errors {
        for api_error in errors {
            record_twitter_api_error(
                database,
                error_details,
                "api_change",
                &api_error,
                Some("/2/users/by"),
            );
        }
    }

    let mut api_users = std::collections::HashMap::new();
    if let Some(users) = users_response.data {
        for user in users {
            api_users.insert(user.username.clone(), user);
        }
    }

    let base_start_time = Utc::now() - Duration::days(config.history_depth_days as i64);

    for tracked_user in active_users {
        if shutdown.load(Ordering::SeqCst) {
            *status = "failed";
            record_error(
                database,
                error_details,
                "other",
                "Shutdown requested".to_string(),
                None,
                None,
            );
            break;
        }

        let Some(api_user) = api_users.get(&tracked_user.username) else {
            record_error(
                database,
                error_details,
                "api_change",
                format!("Twitter user not found: @{}", tracked_user.username),
                None,
                Some("/2/users/by"),
            );
            continue;
        };

        database.update_user_from_api(
            &tracked_user.username,
            &api_user.id,
            Some(&api_user.name),
            api_user.profile_image_url.as_deref(),
            api_user
                .public_metrics
                .as_ref()
                .and_then(|metrics| metrics.followers_count),
            api_user
                .public_metrics
                .as_ref()
                .and_then(|metrics| metrics.following_count),
        )?;

        let start_time = match database.get_checkpoint(tracked_user.id)? {
            Some(checkpoint) if checkpoint > base_start_time => checkpoint + Duration::seconds(1),
            _ => base_start_time,
        };

        let fetched = twitter_client
            .fetch_user_tweets(&api_user.id, start_time)
            .await;

        let fetch_result = match fetched {
            Ok(result) => result,
            Err(error) => {
                record_error(
                    database,
                    error_details,
                    error_kind(&error),
                    format!("Failed fetching tweets for @{}", tracked_user.username),
                    None,
                    Some("/2/users/:id/tweets"),
                );
                if should_abort_on_error(&error) {
                    *status = "failed";
                    return Err(error);
                }
                continue;
            }
        };

        for api_error in fetch_result.errors {
            record_twitter_api_error(
                database,
                error_details,
                "api_change",
                &api_error,
                Some("/2/users/:id/tweets"),
            );
        }

        let (inserted, enqueued, latest) = database.insert_tweets_and_enqueue(
            tracked_user.id,
            &fetch_result.tweets,
            &enabled_models,
        )?;
        *tweets_fetched += inserted;
        *tweets_queued += enqueued;

        if let Some(latest_timestamp) = latest {
            database.set_checkpoint(tracked_user.id, latest_timestamp)?;
        }
    }

    info!(
        "Crawl cycle complete: {} tweets fetched, {} analysis jobs queued",
        tweets_fetched, tweets_queued
    );

    Ok(())
}

fn process_reanalysis_requests(
    database: &Database,
    enabled_models: &[i64],
    shutdown: &AtomicBool,
    error_details: &mut Vec<ApiErrorDetail>,
) -> Result<(), CrawlerError> {
    let requests = database.load_pending_reanalysis_requests(25)?;
    for request in requests {
        if shutdown.load(Ordering::SeqCst) {
            record_error(
                database,
                error_details,
                "other",
                "Shutdown requested".to_string(),
                None,
                None,
            );
            break;
        }

        database.mark_reanalysis_processing(request.id)?;

        let enqueue_result = match request.request_type.as_str() {
            "tweet" => {
                let Some(tweet_id) = request.tweet_id else {
                    Err(CrawlerError::Config(
                        "Missing tweet_id for reanalysis request".to_string(),
                    ))
                }?;
                database.enqueue_reanalysis_for_tweet(tweet_id, enabled_models)
            }
            "user" => {
                let Some(user_id) = request.twitter_user_id else {
                    Err(CrawlerError::Config(
                        "Missing twitter_user_id for reanalysis request".to_string(),
                    ))
                }?;
                database.enqueue_reanalysis_for_user(user_id, enabled_models)
            }
            "all" => database.enqueue_reanalysis_for_all(enabled_models),
            _ => Err(CrawlerError::Config(format!(
                "Unknown reanalysis request type: {}",
                request.request_type
            ))),
        };

        if let Err(error) = enqueue_result {
            record_error(
                database,
                error_details,
                error_kind(&error),
                format!("Failed reanalysis request {}", request.id),
                None,
                None,
            );
        }

        database.mark_reanalysis_completed(request.id)?;
    }

    Ok(())
}

fn record_twitter_api_error(
    database: &Database,
    error_details: &mut Vec<ApiErrorDetail>,
    error_type: &str,
    api_error: &TwitterApiError,
    endpoint: Option<&str>,
) {
    let title = api_error.title.as_deref().unwrap_or("Twitter API error");
    let detail = api_error.detail.as_deref().unwrap_or("Unknown error");
    let message = format!("{title}: {detail}");
    record_error(
        database,
        error_details,
        error_type,
        message,
        api_error.type_.as_deref(),
        endpoint,
    );
}

fn record_error(
    database: &Database,
    error_details: &mut Vec<ApiErrorDetail>,
    error_type: &str,
    message: String,
    code: Option<&str>,
    endpoint: Option<&str>,
) {
    let detail = ApiErrorDetail {
        error_type: error_type.to_string(),
        message: message.clone(),
        code: code.map(|value| value.to_string()),
        endpoint: endpoint.map(|value| value.to_string()),
        timestamp: Utc::now().to_rfc3339(),
    };
    error_details.push(detail);

    if let Err(error) = database.insert_api_error(error_type, &message, code, endpoint) {
        warn!("Failed to record api error: {}", error);
    }
}

fn error_kind(error: &CrawlerError) -> &'static str {
    match error {
        CrawlerError::RateLimitExceeded => "rate_limit",
        CrawlerError::Authentication(_) => "auth",
        CrawlerError::Network(_) => "network",
        CrawlerError::TwitterApi(_) => "api_change",
        _ => "other",
    }
}

fn should_abort_on_error(error: &CrawlerError) -> bool {
    matches!(
        error,
        CrawlerError::RateLimitExceeded | CrawlerError::Authentication(_)
    )
}
