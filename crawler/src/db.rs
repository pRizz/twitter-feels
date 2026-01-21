//! SQLite access for the crawler

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::json;

use crate::error::CrawlerError;
use crate::models::{ReanalysisRequest, TrackedUser, TwitterApiTweet};

#[derive(Debug, Serialize)]
pub struct ApiErrorDetail {
    pub error_type: String,
    pub message: String,
    pub code: Option<String>,
    pub endpoint: Option<String>,
    pub timestamp: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(database_url: &str) -> Result<Self, CrawlerError> {
        let conn = Connection::open(database_url)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(Self { conn })
    }

    pub fn init_schema(&self) -> Result<(), CrawlerError> {
        let sql = r#"
            CREATE TABLE IF NOT EXISTS analysis_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tweet_id INTEGER NOT NULL,
                llm_model_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                attempt_count INTEGER DEFAULT 0,
                last_error TEXT,
                enqueued_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(tweet_id, llm_model_id),
                FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE,
                FOREIGN KEY (llm_model_id) REFERENCES llm_models(id)
            );

            CREATE TABLE IF NOT EXISTS crawler_checkpoints (
                twitter_user_id INTEGER PRIMARY KEY,
                last_tweet_timestamp TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (twitter_user_id) REFERENCES twitter_users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reanalysis_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_type TEXT NOT NULL,
                tweet_id INTEGER,
                twitter_user_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                requested_at TEXT DEFAULT (datetime('now')),
                processed_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
            CREATE INDEX IF NOT EXISTS idx_analysis_queue_tweet ON analysis_queue(tweet_id);
            CREATE INDEX IF NOT EXISTS idx_reanalysis_status ON reanalysis_requests(status);
        "#;

        self.conn.execute_batch(sql)?;
        Ok(())
    }

    pub fn create_crawler_run(&self) -> Result<i64, CrawlerError> {
        self.conn.execute(
            "INSERT INTO crawler_runs (status, tweets_fetched, tweets_analyzed, errors_count)
             VALUES ('running', 0, 0, 0)",
            [],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn complete_crawler_run(
        &self,
        run_id: i64,
        status: &str,
        tweets_fetched: u64,
        tweets_analyzed: u64,
        error_details: &[ApiErrorDetail],
    ) -> Result<(), CrawlerError> {
        let error_count = error_details.len() as u64;
        let error_json = if error_details.is_empty() {
            None
        } else {
            Some(serde_json::to_string(error_details).map_err(|err| {
                CrawlerError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(err)))
            })?)
        };

        self.conn.execute(
            "UPDATE crawler_runs
             SET status = ?,
                 completed_at = datetime('now'),
                 tweets_fetched = ?,
                 tweets_analyzed = ?,
                 errors_count = ?,
                 error_details = ?
             WHERE id = ?",
            params![
                status,
                tweets_fetched as i64,
                tweets_analyzed as i64,
                error_count as i64,
                error_json,
                run_id
            ],
        )?;

        Ok(())
    }

    pub fn insert_api_error(
        &self,
        error_type: &str,
        error_message: &str,
        error_code: Option<&str>,
        endpoint: Option<&str>,
    ) -> Result<(), CrawlerError> {
        self.conn.execute(
            "INSERT INTO api_errors (error_type, error_message, error_code, endpoint, resolved)
             VALUES (?, ?, ?, ?, 0)",
            params![error_type, error_message, error_code, endpoint],
        )?;
        Ok(())
    }

    pub fn load_active_users(&self) -> Result<Vec<TrackedUser>, CrawlerError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, twitter_id, username, display_name
             FROM twitter_users
             WHERE is_active = 1",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TrackedUser {
                id: row.get(0)?,
                twitter_id: row.get(1)?,
                username: row.get(2)?,
                display_name: row.get(3)?,
            })
        })?;

        let mut users = Vec::new();
        for row in rows {
            users.push(row?);
        }

        Ok(users)
    }

    pub fn update_user_from_api(
        &self,
        username: &str,
        twitter_id: &str,
        display_name: Option<&str>,
        avatar_url: Option<&str>,
        follower_count: Option<u64>,
        following_count: Option<u64>,
    ) -> Result<(), CrawlerError> {
        self.conn.execute(
            "UPDATE twitter_users
             SET twitter_id = COALESCE(?, twitter_id),
                 display_name = COALESCE(?, display_name),
                 avatar_url = COALESCE(?, avatar_url),
                 follower_count = COALESCE(?, follower_count),
                 following_count = COALESCE(?, following_count),
                 updated_at = datetime('now')
             WHERE username = ?",
            params![
                twitter_id,
                display_name,
                avatar_url,
                follower_count.map(|value| value as i64),
                following_count.map(|value| value as i64),
                username
            ],
        )?;
        Ok(())
    }

    pub fn get_enabled_model_ids(&self) -> Result<Vec<i64>, CrawlerError> {
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM llm_models WHERE is_enabled = 1")?;

        let rows = stmt.query_map([], |row| row.get(0))?;
        let mut ids = Vec::new();
        for row in rows {
            ids.push(row?);
        }
        Ok(ids)
    }

    pub fn get_checkpoint(&self, twitter_user_id: i64) -> Result<Option<DateTime<Utc>>, CrawlerError> {
        let timestamp: Option<String> = self
            .conn
            .query_row(
                "SELECT last_tweet_timestamp FROM crawler_checkpoints WHERE twitter_user_id = ?",
                params![twitter_user_id],
                |row| row.get(0),
            )
            .optional()?;

        let Some(timestamp) = timestamp else {
            return Ok(None);
        };

        let parsed = DateTime::parse_from_rfc3339(&timestamp)
            .map(|dt| dt.with_timezone(&Utc))
            .ok();

        Ok(parsed)
    }

    pub fn set_checkpoint(
        &self,
        twitter_user_id: i64,
        timestamp: DateTime<Utc>,
    ) -> Result<(), CrawlerError> {
        self.conn.execute(
            "INSERT INTO crawler_checkpoints (twitter_user_id, last_tweet_timestamp, updated_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT(twitter_user_id) DO UPDATE SET
                 last_tweet_timestamp = excluded.last_tweet_timestamp,
                 updated_at = datetime('now')",
            params![twitter_user_id, timestamp.to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn insert_tweets_and_enqueue(
        &self,
        twitter_user_id: i64,
        tweets: &[TwitterApiTweet],
        enabled_model_ids: &[i64],
    ) -> Result<(u64, u64, Option<DateTime<Utc>>), CrawlerError> {
        let mut tweets_inserted = 0_u64;
        let mut jobs_enqueued = 0_u64;
        let mut latest_timestamp: Option<DateTime<Utc>> = None;

        let mut stmt = self.conn.prepare(
            "INSERT OR IGNORE INTO tweets
             (twitter_user_id, tweet_id, content, tweet_timestamp, engagement_metrics, is_retweet, is_reply)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )?;

        for tweet in tweets {
            let metrics = tweet.public_metrics.as_ref();
            let engagement = json!({
                "likes": metrics.and_then(|m| m.like_count).unwrap_or(0),
                "retweets": metrics.and_then(|m| m.retweet_count).unwrap_or(0),
                "replies": metrics.and_then(|m| m.reply_count).unwrap_or(0),
                "quotes": metrics.and_then(|m| m.quote_count).unwrap_or(0),
            });

            let is_retweet = tweet
                .referenced_tweets
                .as_ref()
                .map(|refs| refs.iter().any(|r| r.reference_type == "retweeted"))
                .unwrap_or(false);
            let is_reply = tweet
                .referenced_tweets
                .as_ref()
                .map(|refs| refs.iter().any(|r| r.reference_type == "replied_to"))
                .unwrap_or(false);

            let changes = stmt.execute(params![
                twitter_user_id,
                tweet.id,
                tweet.text,
                tweet.created_at.to_rfc3339(),
                engagement.to_string(),
                if is_retweet { 1 } else { 0 },
                if is_reply { 1 } else { 0 }
            ])?;

            if changes > 0 {
                tweets_inserted += 1;
                let tweet_db_id = self.conn.last_insert_rowid();
                jobs_enqueued += self.enqueue_jobs(tweet_db_id, enabled_model_ids)?;
            }

            latest_timestamp = match latest_timestamp {
                Some(current) if current >= tweet.created_at => Some(current),
                _ => Some(tweet.created_at),
            };
        }

        Ok((tweets_inserted, jobs_enqueued, latest_timestamp))
    }

    pub fn enqueue_reanalysis_for_tweet(
        &self,
        tweet_id: i64,
        enabled_model_ids: &[i64],
    ) -> Result<u64, CrawlerError> {
        self.enqueue_jobs(tweet_id, enabled_model_ids)
    }

    pub fn enqueue_reanalysis_for_user(
        &self,
        twitter_user_id: i64,
        enabled_model_ids: &[i64],
    ) -> Result<u64, CrawlerError> {
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM tweets WHERE twitter_user_id = ?")?;
        let rows = stmt.query_map(params![twitter_user_id], |row| row.get(0))?;
        let mut jobs = 0_u64;
        for row in rows {
            let tweet_id: i64 = row?;
            jobs += self.enqueue_jobs(tweet_id, enabled_model_ids)?;
        }
        Ok(jobs)
    }

    pub fn enqueue_reanalysis_for_all(
        &self,
        enabled_model_ids: &[i64],
    ) -> Result<u64, CrawlerError> {
        let mut stmt = self.conn.prepare("SELECT id FROM tweets")?;
        let rows = stmt.query_map([], |row| row.get(0))?;
        let mut jobs = 0_u64;
        for row in rows {
            let tweet_id: i64 = row?;
            jobs += self.enqueue_jobs(tweet_id, enabled_model_ids)?;
        }
        Ok(jobs)
    }

    pub fn load_pending_reanalysis_requests(
        &self,
        limit: i64,
    ) -> Result<Vec<ReanalysisRequest>, CrawlerError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, request_type, tweet_id, twitter_user_id
             FROM reanalysis_requests
             WHERE status = 'pending'
             ORDER BY requested_at ASC
             LIMIT ?",
        )?;

        let rows = stmt.query_map(params![limit], |row| {
            Ok(ReanalysisRequest {
                id: row.get(0)?,
                request_type: row.get(1)?,
                tweet_id: row.get(2)?,
                twitter_user_id: row.get(3)?,
            })
        })?;

        let mut requests = Vec::new();
        for row in rows {
            requests.push(row?);
        }

        Ok(requests)
    }

    pub fn mark_reanalysis_processing(&self, request_id: i64) -> Result<(), CrawlerError> {
        self.conn.execute(
            "UPDATE reanalysis_requests
             SET status = 'processing'
             WHERE id = ?",
            params![request_id],
        )?;
        Ok(())
    }

    pub fn mark_reanalysis_completed(&self, request_id: i64) -> Result<(), CrawlerError> {
        self.conn.execute(
            "UPDATE reanalysis_requests
             SET status = 'completed',
                 processed_at = datetime('now')
             WHERE id = ?",
            params![request_id],
        )?;
        Ok(())
    }

    fn enqueue_jobs(
        &self,
        tweet_id: i64,
        enabled_model_ids: &[i64],
    ) -> Result<u64, CrawlerError> {
        let mut jobs_enqueued = 0_u64;

        if enabled_model_ids.is_empty() {
            jobs_enqueued += self.enqueue_job(tweet_id, None)?;
        } else {
            for model_id in enabled_model_ids {
                jobs_enqueued += self.enqueue_job(tweet_id, Some(*model_id))?;
            }
        }

        Ok(jobs_enqueued)
    }

    fn enqueue_job(
        &self,
        tweet_id: i64,
        llm_model_id: Option<i64>,
    ) -> Result<u64, CrawlerError> {
        let changes = self.conn.execute(
            "INSERT OR IGNORE INTO analysis_queue (tweet_id, llm_model_id)
             VALUES (?, ?)",
            params![tweet_id, llm_model_id],
        )?;
        Ok(changes as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::TwitterApiTweet;
    use chrono::{Duration, TimeZone};

    fn setup_db() -> Result<Database, CrawlerError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(
            "CREATE TABLE tweets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                twitter_user_id INTEGER NOT NULL,
                tweet_id TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL,
                tweet_timestamp TEXT NOT NULL,
                engagement_metrics TEXT,
                is_retweet INTEGER DEFAULT 0,
                is_reply INTEGER DEFAULT 0
            );
            CREATE TABLE llm_models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                is_enabled INTEGER DEFAULT 0
            );
            CREATE TABLE twitter_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                twitter_id TEXT,
                username TEXT,
                display_name TEXT,
                is_active INTEGER DEFAULT 1
            );
            CREATE TABLE crawler_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT,
                tweets_fetched INTEGER DEFAULT 0,
                tweets_analyzed INTEGER DEFAULT 0,
                errors_count INTEGER DEFAULT 0,
                error_details TEXT,
                started_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE api_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_type TEXT,
                error_message TEXT,
                error_code TEXT,
                endpoint TEXT,
                occurred_at TEXT DEFAULT (datetime('now')),
                resolved INTEGER DEFAULT 0
            );",
        )?;

        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }

    #[test]
    fn insert_tweets_ignores_duplicates() -> Result<(), CrawlerError> {
        let db = setup_db()?;
        let tweet_time = Utc.with_ymd_and_hms(2024, 1, 10, 12, 0, 0).unwrap();
        let tweet = TwitterApiTweet {
            id: "tweet_1".to_string(),
            text: "hello".to_string(),
            created_at: tweet_time,
            public_metrics: None,
            referenced_tweets: None,
        };

        let (first_inserted, first_jobs, _) =
            db.insert_tweets_and_enqueue(1, &[tweet.clone()], &[])?;
        let (second_inserted, second_jobs, _) =
            db.insert_tweets_and_enqueue(1, &[tweet], &[])?;

        assert_eq!(first_inserted, 1);
        assert_eq!(first_jobs, 1);
        assert_eq!(second_inserted, 0);
        assert_eq!(second_jobs, 0);

        Ok(())
    }

    #[test]
    fn checkpoint_updates_with_latest_timestamp() -> Result<(), CrawlerError> {
        let db = setup_db()?;
        db.conn.execute(
            "INSERT INTO twitter_users (id, twitter_id, username, display_name, is_active)
             VALUES (?, ?, ?, ?, 1)",
            params![5, "user_5", "user5", "User Five"],
        )?;
        let older = Utc::now() - Duration::days(2);
        let newer = Utc::now() - Duration::days(1);

        db.set_checkpoint(5, older)?;
        db.set_checkpoint(5, newer)?;

        let stored = db.get_checkpoint(5)?.expect("checkpoint missing");
        assert_eq!(stored.timestamp(), newer.timestamp());

        Ok(())
    }
}
