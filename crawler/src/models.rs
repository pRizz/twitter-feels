//! Data models for Twitter API and database mapping

use chrono::{DateTime, Utc};
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct TrackedUser {
    pub id: i64,
    pub twitter_id: String,
    pub username: String,
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct TwitterUsersResponse {
    pub data: Option<Vec<TwitterApiUser>>,
    pub errors: Option<Vec<TwitterApiError>>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterApiUser {
    pub id: String,
    pub name: String,
    pub username: String,
    pub public_metrics: Option<TwitterUserMetrics>,
    pub profile_image_url: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterUserMetrics {
    pub followers_count: Option<u64>,
    pub following_count: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct TwitterUserTweetsResponse {
    pub data: Option<Vec<TwitterApiTweet>>,
    pub meta: Option<TwitterTweetsMeta>,
    pub errors: Option<Vec<TwitterApiError>>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterApiTweet {
    pub id: String,
    pub text: String,
    pub created_at: DateTime<Utc>,
    pub public_metrics: Option<TwitterTweetMetrics>,
    pub referenced_tweets: Option<Vec<TwitterReferencedTweet>>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterTweetMetrics {
    pub like_count: Option<u64>,
    pub retweet_count: Option<u64>,
    pub reply_count: Option<u64>,
    pub quote_count: Option<u64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterReferencedTweet {
    #[serde(rename = "type")]
    pub reference_type: String,
    pub id: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterTweetsMeta {
    pub result_count: Option<u32>,
    pub next_token: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TwitterApiError {
    pub title: Option<String>,
    pub detail: Option<String>,
    pub type_: Option<String>,
}

#[derive(Debug)]
pub struct ReanalysisRequest {
    pub id: i64,
    pub request_type: String,
    pub tweet_id: Option<i64>,
    pub twitter_user_id: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_users_response() {
        let payload = r#"{
            "data": [
                {
                    "id": "123",
                    "name": "Test User",
                    "username": "tester",
                    "public_metrics": { "followers_count": 42, "following_count": 7 },
                    "profile_image_url": "https://example.com/avatar.png"
                }
            ]
        }"#;

        let parsed: TwitterUsersResponse = serde_json::from_str(payload).expect("parse users");
        let users = parsed.data.expect("missing data");
        assert_eq!(users.len(), 1);
        assert_eq!(users[0].username, "tester");
        assert_eq!(users[0].public_metrics.as_ref().unwrap().followers_count, Some(42));
    }

    #[test]
    fn parse_tweets_response() {
        let payload = r#"{
            "data": [
                {
                    "id": "tweet_1",
                    "text": "hello",
                    "created_at": "2024-01-10T12:00:00.000Z",
                    "public_metrics": {
                        "like_count": 10,
                        "retweet_count": 2,
                        "reply_count": 1,
                        "quote_count": 0
                    },
                    "referenced_tweets": [
                        { "type": "replied_to", "id": "tweet_0" }
                    ]
                }
            ],
            "meta": { "result_count": 1 }
        }"#;

        let parsed: TwitterUserTweetsResponse = serde_json::from_str(payload).expect("parse tweets");
        let tweets = parsed.data.expect("missing data");
        assert_eq!(tweets.len(), 1);
        assert_eq!(tweets[0].id, "tweet_1");
        assert_eq!(tweets[0].public_metrics.as_ref().unwrap().like_count, Some(10));
    }
}
