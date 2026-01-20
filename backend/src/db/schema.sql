-- Twitter Feels Database Schema
-- SQLite with proper indexes for performance

-- Tracked Twitter users
CREATE TABLE IF NOT EXISTS twitter_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitter_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tweets
CREATE TABLE IF NOT EXISTS tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitter_user_id INTEGER NOT NULL,
    tweet_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    tweet_timestamp TEXT NOT NULL,
    engagement_metrics TEXT, -- JSON: {likes, retweets, replies}
    is_retweet INTEGER DEFAULT 0,
    is_reply INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (twitter_user_id) REFERENCES twitter_users(id) ON DELETE CASCADE
);

-- LLM Models
CREATE TABLE IF NOT EXISTS llm_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT,
    provider TEXT, -- 'local', 'huggingface', etc.
    huggingface_model_id TEXT,
    is_local INTEGER DEFAULT 1,
    is_enabled INTEGER DEFAULT 0,
    download_status TEXT DEFAULT 'not_downloaded', -- not_downloaded, downloading, ready, error
    disk_size_bytes INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Sentiment Analyses
CREATE TABLE IF NOT EXISTS sentiment_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id INTEGER NOT NULL,
    llm_model_id INTEGER NOT NULL,
    emotion_scores TEXT NOT NULL, -- JSON: {happy: 75, sad: 10, ...}
    raw_llm_response TEXT,
    analyzed_at TEXT DEFAULT (datetime('now')),
    analysis_duration_ms INTEGER,
    FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE,
    FOREIGN KEY (llm_model_id) REFERENCES llm_models(id)
);

-- User Aggregations (pre-computed for performance)
CREATE TABLE IF NOT EXISTS user_aggregations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitter_user_id INTEGER NOT NULL,
    llm_model_id INTEGER, -- NULL for combined scores
    time_bucket TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly', 'all_time'
    bucket_start_date TEXT,
    emotion_averages TEXT NOT NULL, -- JSON
    emotion_medians TEXT, -- JSON
    emotion_modes TEXT, -- JSON
    tweet_count INTEGER DEFAULT 0,
    computed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (twitter_user_id) REFERENCES twitter_users(id) ON DELETE CASCADE,
    FOREIGN KEY (llm_model_id) REFERENCES llm_models(id)
);

-- Global Aggregations
CREATE TABLE IF NOT EXISTS global_aggregations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    llm_model_id INTEGER, -- NULL for combined scores
    time_bucket TEXT NOT NULL,
    bucket_start_date TEXT,
    emotion_averages TEXT NOT NULL, -- JSON
    gauge_values TEXT, -- JSON
    computed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (llm_model_id) REFERENCES llm_models(id)
);

-- Crawler Runs
CREATE TABLE IF NOT EXISTS crawler_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT DEFAULT 'running', -- running, completed, failed
    tweets_fetched INTEGER DEFAULT 0,
    tweets_analyzed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT -- JSON array
);

-- API Errors
CREATE TABLE IF NOT EXISTS api_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT NOT NULL, -- rate_limit, auth, network, api_change, other
    error_message TEXT,
    error_code TEXT,
    endpoint TEXT,
    occurred_at TEXT DEFAULT (datetime('now')),
    resolved INTEGER DEFAULT 0
);

-- Configurations (key-value store)
CREATE TABLE IF NOT EXISTS configurations (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON
    updated_at TEXT DEFAULT (datetime('now')),
    updated_by TEXT
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tweets_user_id ON tweets(twitter_user_id);
CREATE INDEX IF NOT EXISTS idx_tweets_timestamp ON tweets(tweet_timestamp);
CREATE INDEX IF NOT EXISTS idx_sentiment_tweet ON sentiment_analyses(tweet_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_model ON sentiment_analyses(llm_model_id);
CREATE INDEX IF NOT EXISTS idx_user_agg_user ON user_aggregations(twitter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_agg_bucket ON user_aggregations(time_bucket, bucket_start_date);
CREATE INDEX IF NOT EXISTS idx_global_agg_bucket ON global_aggregations(time_bucket, bucket_start_date);
CREATE INDEX IF NOT EXISTS idx_api_errors_type ON api_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_api_errors_time ON api_errors(occurred_at);

-- Default configuration values
INSERT OR IGNORE INTO configurations (key, value) VALUES
    ('emotions', '{"happy":{"color":"#FFD700"},"sad":{"color":"#4169E1"},"angry":{"color":"#FF4444"},"fearful":{"color":"#9932CC"},"hatred":{"color":"#8B0000"},"thankful":{"color":"#32CD32"},"excited":{"color":"#FF6B35"},"hopeful":{"color":"#00CED1"},"frustrated":{"color":"#FF8C00"},"sarcastic":{"color":"#BA55D3"},"inspirational":{"color":"#FFD700"},"anxious":{"color":"#708090"}}'),
    ('gauges', '[{"name":"Anger Gauge","lowLabel":"Chill","highLabel":"Angry","emotions":["angry","frustrated","hatred"]},{"name":"Inspiration Gauge","lowLabel":"Doomer","highLabel":"Kurzweilian","emotions":["inspirational","hopeful","excited"]},{"name":"Gratitude Gauge","lowLabel":"Entitled","highLabel":"Thankful","emotions":["thankful"]},{"name":"Mood Gauge","lowLabel":"Gloomy","highLabel":"Joyful","emotions":["happy"],"invertedEmotions":["sad"]},{"name":"Intensity Gauge","lowLabel":"Zen","highLabel":"Heated","emotions":["angry","excited","anxious","frustrated"]},{"name":"Playfulness Gauge","lowLabel":"Serious","highLabel":"Comedian","emotions":["sarcastic","happy","excited"]}]'),
    ('crawler', '{"intervalHours":1,"historyDepthDays":90,"rateLimitPer15Min":450}');

-- Default admin user (password: admin - for development only, change in production!)
-- Note: This is a placeholder hash. In production, use proper bcrypt hashing.
INSERT OR IGNORE INTO admin_users (id, username, password_hash) VALUES
    (1, 'admin', 'hashed_admin');
