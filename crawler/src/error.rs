//! Error types for the crawler

use thiserror::Error;

/// Crawler error types
#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum CrawlerError {
    #[error("Twitter API error: {0}")]
    TwitterApi(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Authentication error: {0}")]
    Authentication(String),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("LLM inference error: {0}")]
    #[allow(dead_code)]
    LlmInference(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
}
