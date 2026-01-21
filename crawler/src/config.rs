//! Configuration module for the crawler

use std::env;

/// Crawler configuration loaded from environment variables
#[allow(dead_code)]
pub struct Config {
    /// Path to SQLite database
    pub database_url: String,

    /// Twitter API bearer token
    pub twitter_bearer_token: String,

    /// How often to run the crawler (in hours)
    pub crawl_interval_hours: u32,

    /// How far back to fetch tweets (in days)
    pub history_depth_days: u32,

    /// Rate limit for Twitter API (requests per 15 minutes)
    pub rate_limit_per_15min: u32,

    /// Default LLM model to use
    #[allow(dead_code)]
    pub default_model: String,

    /// Hugging Face API token (optional)
    #[allow(dead_code)]
    pub huggingface_token: Option<String>,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> anyhow::Result<Self> {
        let twitter_bearer_token = env::var("TWITTER_BEARER_TOKEN").unwrap_or_default();
        if twitter_bearer_token.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "TWITTER_BEARER_TOKEN is required for the crawler"
            ));
        }

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "../backend/data/twitter_feels.db".to_string()),

            twitter_bearer_token,

            crawl_interval_hours: env::var("CRAWL_INTERVAL_HOURS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1),

            history_depth_days: env::var("HISTORY_DEPTH_DAYS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(90),

            rate_limit_per_15min: env::var("RATE_LIMIT_PER_15MIN")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(450),

            default_model: env::var("DEFAULT_MODEL")
                .unwrap_or_else(|_| "meta-llama/Llama-3.2-3B-Instruct".to_string()),

            huggingface_token: env::var("HUGGINGFACE_TOKEN").ok(),
        })
    }
}
