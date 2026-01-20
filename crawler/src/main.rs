//! Twitter Feels Crawler
//!
//! A Rust-based crawler that fetches tweets from Twitter/X and analyzes
//! them for sentiment using configurable LLM models.

mod config;
mod error;

use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;

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

    // Main crawler loop
    loop {
        {
            let mut state_guard = state.lock().await;
            if state_guard.is_running {
                warn!("Crawler already running, skipping this cycle");
            } else {
                state_guard.is_running = true;
                drop(state_guard);

                // Run crawler
                if let Err(e) = run_crawl_cycle(&config).await {
                    warn!("Crawl cycle failed: {}", e);
                }

                // Mark as not running
                let mut state_guard = state.lock().await;
                state_guard.is_running = false;
            }
        }

        // Wait for next cycle
        info!(
            "Waiting {} hours until next crawl cycle...",
            config.crawl_interval_hours
        );
        tokio::time::sleep(tokio::time::Duration::from_secs(
            config.crawl_interval_hours as u64 * 3600,
        ))
        .await;
    }
}

async fn run_crawl_cycle(config: &Config) -> anyhow::Result<()> {
    info!("Starting crawl cycle...");

    // TODO: Implement actual crawling logic
    // 1. Fetch list of tracked users from database
    // 2. For each user, fetch recent tweets from Twitter API
    // 3. Store new tweets in database
    // 4. Queue tweets for LLM analysis
    // 5. Run sentiment analysis
    // 6. Store analysis results
    // 7. Update aggregations

    info!(
        "Crawl cycle placeholder - will fetch tweets with {} day history",
        config.history_depth_days
    );

    Ok(())
}
