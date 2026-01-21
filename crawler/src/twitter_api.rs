//! Twitter API v2 client

use chrono::{DateTime, Utc};
use governor::clock::{Clock, DefaultClock};
use reqwest::{Client, StatusCode};
use serde::de::DeserializeOwned;

use crate::error::CrawlerError;
use crate::models::{TwitterApiError, TwitterApiTweet, TwitterUserTweetsResponse, TwitterUsersResponse};
use crate::rate_limit::SharedRateLimiter;

const BASE_URL: &str = "https://api.twitter.com/2";

pub struct TwitterApiClient {
    client: Client,
    bearer_token: String,
    rate_limiter: SharedRateLimiter,
}

pub struct TweetFetchResult {
    pub tweets: Vec<TwitterApiTweet>,
    pub errors: Vec<TwitterApiError>,
}

impl TwitterApiClient {
    pub fn new(bearer_token: String, rate_limiter: SharedRateLimiter) -> Result<Self, CrawlerError> {
        let client = Client::builder()
            .user_agent("twitter-feels-crawler/0.1")
            .build()?;

        Ok(Self {
            client,
            bearer_token,
            rate_limiter,
        })
    }

    pub async fn fetch_users_by_usernames(
        &self,
        usernames: &[String],
    ) -> Result<TwitterUsersResponse, CrawlerError> {
        if usernames.is_empty() {
            return Ok(TwitterUsersResponse {
                data: Some(Vec::new()),
                errors: None,
            });
        }

        let mut all_users = Vec::new();
        let mut all_errors = Vec::new();

        for chunk in usernames.chunks(100) {
            let joined = chunk.join(",");
            let request = self
                .client
                .get(format!("{BASE_URL}/users/by"))
                .query(&[
                    ("usernames", joined.as_str()),
                    ("user.fields", "public_metrics,profile_image_url"),
                ]);

            let response: TwitterUsersResponse = self
                .send_request(request, "/2/users/by")
                .await?;

            if let Some(users) = response.data {
                all_users.extend(users);
            }
            if let Some(errors) = response.errors {
                all_errors.extend(errors);
            }
        }

        Ok(TwitterUsersResponse {
            data: Some(all_users),
            errors: if all_errors.is_empty() {
                None
            } else {
                Some(all_errors)
            },
        })
    }

    pub async fn fetch_user_tweets(
        &self,
        user_id: &str,
        start_time: DateTime<Utc>,
    ) -> Result<TweetFetchResult, CrawlerError> {
        let mut tweets = Vec::new();
        let mut errors = Vec::new();
        let mut next_token: Option<String> = None;

        loop {
            let mut request = self
                .client
                .get(format!("{BASE_URL}/users/{user_id}/tweets"))
                .query(&[
                    ("tweet.fields", "created_at,public_metrics,referenced_tweets"),
                    ("start_time", start_time.to_rfc3339().as_str()),
                    ("max_results", "100"),
                ]);

            if let Some(token) = &next_token {
                request = request.query(&[("pagination_token", token.as_str())]);
            }

            let response: TwitterUserTweetsResponse = self
                .send_request(request, "/2/users/:id/tweets")
                .await?;

            if let Some(page_tweets) = response.data {
                tweets.extend(page_tweets);
            }
            if let Some(page_errors) = response.errors {
                errors.extend(page_errors);
            }

            next_token = response.meta.and_then(|meta| meta.next_token);
            if next_token.is_none() {
                break;
            }
        }

        Ok(TweetFetchResult { tweets, errors })
    }

    async fn send_request<T: DeserializeOwned>(
        &self,
        request: reqwest::RequestBuilder,
        endpoint: &str,
    ) -> Result<T, CrawlerError> {
        self.wait_for_rate_limit().await?;

        let response = request
            .bearer_auth(&self.bearer_token)
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;

        if !status.is_success() {
            return Err(match status {
                StatusCode::UNAUTHORIZED => {
                    CrawlerError::Authentication(format!("Twitter auth error at {endpoint}"))
                }
                StatusCode::TOO_MANY_REQUESTS => CrawlerError::RateLimitExceeded,
                _ => CrawlerError::TwitterApi(format!(
                    "Twitter API error at {endpoint}: {status} {body}"
                )),
            });
        }

        serde_json::from_str(&body).map_err(|err| {
            CrawlerError::TwitterApi(format!("Failed to parse Twitter response: {err}"))
        })
    }

    async fn wait_for_rate_limit(&self) -> Result<(), CrawlerError> {
        loop {
            match self.rate_limiter.check() {
                Ok(_) => return Ok(()),
                Err(negative) => {
                    let wait = negative.wait_time_from(DefaultClock::default().now());
                    tokio::time::sleep(wait).await;
                }
            }
        }
    }
}
