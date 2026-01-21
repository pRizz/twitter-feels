import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
const dbPath = process.env.DATABASE_URL || join(dataDir, 'playwright_seed.db');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

type EmotionScores = Record<string, number>;

const emotions = [
  'happy',
  'sad',
  'angry',
  'fearful',
  'hatred',
  'thankful',
  'excited',
  'hopeful',
  'frustrated',
  'sarcastic',
  'inspirational',
  'anxious',
];

function makeEmotionScores(seed: number): EmotionScores {
  const scores: EmotionScores = {};
  emotions.forEach((emotion, index) => {
    const value = 10 + ((seed * 7 + index * 3) % 80);
    scores[emotion] = Math.min(100, value);
  });
  return scores;
}

function seedTweets(userId: number, startId: number, count: number) {
  const tweets: Array<{
    id: number;
    tweet_id: string;
    timestamp: string;
    content: string;
  }> = [];

  for (let i = 0; i < count; i += 1) {
    const id = startId + i;
    const day = String(1 + (i % 10)).padStart(2, '0');
    const timestamp = `2026-01-${day}T12:00:00Z`;
    tweets.push({
      id,
      tweet_id: `seed-${userId}-${id}`,
      timestamp,
      content: `Seed tweet ${id} for user ${userId}`,
    });
  }

  const insertTweet = db.prepare(`
    INSERT INTO tweets (id, twitter_user_id, tweet_id, content, tweet_timestamp, engagement_metrics)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAnalysis = db.prepare(`
    INSERT INTO sentiment_analyses (tweet_id, llm_model_id, emotion_scores, analyzed_at, analysis_duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const tweet of tweets) {
    insertTweet.run(
      tweet.id,
      userId,
      tweet.tweet_id,
      tweet.content,
      tweet.timestamp,
      JSON.stringify({ likes: 10, retweets: 2, replies: 1 }),
    );
    const scores = makeEmotionScores(tweet.id);
    insertAnalysis.run(
      tweet.id,
      1,
      JSON.stringify(scores),
      tweet.timestamp,
      120,
    );
  }
}

const seed = db.transaction(() => {
  db.prepare('DELETE FROM sentiment_analyses').run();
  db.prepare('DELETE FROM tweets').run();
  db.prepare('DELETE FROM twitter_users').run();
  db.prepare('DELETE FROM llm_models').run();
  db.prepare('DELETE FROM user_aggregations').run();
  db.prepare('DELETE FROM global_aggregations').run();
  db.prepare('DELETE FROM crawler_runs').run();
  db.prepare('DELETE FROM api_errors').run();
  db.prepare('DELETE FROM analysis_queue').run();
  db.prepare('DELETE FROM crawler_checkpoints').run();
  db.prepare('DELETE FROM reanalysis_requests').run();

  db.prepare(`
    INSERT INTO llm_models (id, name, version, provider, is_local, is_enabled, download_status)
    VALUES (1, 'Seed Model', '1.0', 'local', 1, 1, 'ready')
  `).run();

  db.prepare(`
    INSERT INTO twitter_users
      (id, twitter_id, username, display_name, bio, avatar_url, follower_count, following_count, is_active)
    VALUES
      (4, 'seed-4', 'sam_altman', 'Sam Altman', 'Seeded user for tests.', NULL, 1000000, 100, 1),
      (46, 'seed-46', 'elonmusk', 'Elon Musk', 'Seeded user for tests.', NULL, 200000000, 500, 1)
  `).run();

  seedTweets(4, 40, 25);
  seedTweets(46, 1000, 10);
});

seed();
db.close();
console.log(`Seeded Playwright test database at ${dbPath}`);
