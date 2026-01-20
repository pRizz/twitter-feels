// Seed script for sample Twitter users
import db from './connection.js';

// Sample Twitter influencers for demo purposes
const sampleUsers = [
  {
    twitter_id: '44196397',
    username: 'elonmusk',
    display_name: 'Elon Musk',
    bio: 'CEO of Tesla, SpaceX, and X',
    avatar_url: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    follower_count: 170000000,
    following_count: 500,
  },
  {
    twitter_id: '50393960',
    username: 'BillGates',
    display_name: 'Bill Gates',
    bio: 'Sharing things I\'m learning through my foundation work and other interests.',
    avatar_url: 'https://pbs.twimg.com/profile_images/1674815862879178752/nTGMV1Eo_400x400.jpg',
    follower_count: 63000000,
    following_count: 274,
  },
  {
    twitter_id: '813286',
    username: 'BarackObama',
    display_name: 'Barack Obama',
    bio: 'Dad, husband, former President, citizen.',
    avatar_url: 'https://pbs.twimg.com/profile_images/1329647526807543809/2SGvnHYV_400x400.jpg',
    follower_count: 133000000,
    following_count: 600000,
  },
  {
    twitter_id: '17919972',
    username: 'sama',
    display_name: 'Sam Altman',
    bio: 'CEO of OpenAI',
    avatar_url: 'https://pbs.twimg.com/profile_images/804990434455887872/BG0Xh7Oa_400x400.jpg',
    follower_count: 3000000,
    following_count: 2000,
  },
  {
    twitter_id: '1631922490',
    username: 'naval',
    display_name: 'Naval',
    bio: 'Angel investor',
    avatar_url: 'https://pbs.twimg.com/profile_images/1256841238298292232/ycqwaMI2_400x400.jpg',
    follower_count: 2000000,
    following_count: 1500,
  },
];

export function seedUsers() {
  console.log('Seeding sample Twitter users...');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO twitter_users
    (twitter_id, username, display_name, bio, avatar_url, follower_count, following_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const user of sampleUsers) {
    const result = insert.run(
      user.twitter_id,
      user.username,
      user.display_name,
      user.bio,
      user.avatar_url,
      user.follower_count,
      user.following_count
    );
    if (result.changes > 0) {
      inserted++;
    }
  }

  console.log(`Seeded ${inserted} new users (${sampleUsers.length - inserted} already existed)`);
  return inserted;
}

// Sample tweets for demo/testing purposes
const sampleTweets = [
  {
    twitter_user_id: 1, // Elon Musk
    tweet_id: 'test_tweet_1234567890',
    content: 'Just had an amazing breakthrough at Tesla! The future of sustainable energy is looking brighter than ever. Excited to share more soon! 🚗⚡',
    tweet_timestamp: '2024-01-15T14:30:00Z',
    engagement_metrics: JSON.stringify({ likes: 125000, retweets: 15000, replies: 8500 }),
    is_retweet: 0,
    is_reply: 0,
  },
  {
    twitter_user_id: 1, // Elon Musk
    tweet_id: 'test_tweet_1234567891',
    content: 'Some people never learn. This is incredibly frustrating. 😤',
    tweet_timestamp: '2024-01-14T09:15:00Z',
    engagement_metrics: JSON.stringify({ likes: 85000, retweets: 9200, replies: 12000 }),
    is_retweet: 0,
    is_reply: 0,
  },
  {
    twitter_user_id: 2, // Bill Gates
    tweet_id: 'test_tweet_2345678901',
    content: 'Reading about the latest advances in climate technology. We have the tools to address climate change, now we need the will to use them.',
    tweet_timestamp: '2024-01-15T10:00:00Z',
    engagement_metrics: JSON.stringify({ likes: 45000, retweets: 6500, replies: 2800 }),
    is_retweet: 0,
    is_reply: 0,
  },
];

// Sample LLM model for testing
const sampleModel = {
  name: 'Llama-3-Sentiment',
  version: '3.1',
  provider: 'local',
  huggingface_model_id: 'meta-llama/Llama-3.1-8B-Instruct',
  is_local: 1,
  is_enabled: 1,
  download_status: 'ready',
  disk_size_bytes: 16000000000,
};

// Sample sentiment analyses
const sampleAnalyses = [
  {
    tweet_id: 1,
    llm_model_id: 1,
    emotion_scores: JSON.stringify({
      happy: 75,
      excited: 82,
      hopeful: 70,
      inspirational: 68,
      thankful: 45,
      sad: 5,
      angry: 3,
      frustrated: 8,
      fearful: 2,
      anxious: 10,
      sarcastic: 12,
      hatred: 1,
    }),
    analysis_duration_ms: 1250,
  },
  {
    tweet_id: 2,
    llm_model_id: 1,
    emotion_scores: JSON.stringify({
      happy: 8,
      excited: 5,
      hopeful: 12,
      inspirational: 3,
      thankful: 2,
      sad: 25,
      angry: 65,
      frustrated: 78,
      fearful: 15,
      anxious: 42,
      sarcastic: 18,
      hatred: 28,
    }),
    analysis_duration_ms: 980,
  },
  {
    tweet_id: 3,
    llm_model_id: 1,
    emotion_scores: JSON.stringify({
      happy: 35,
      excited: 28,
      hopeful: 55,
      inspirational: 62,
      thankful: 22,
      sad: 18,
      angry: 8,
      frustrated: 12,
      fearful: 25,
      anxious: 30,
      sarcastic: 5,
      hatred: 2,
    }),
    analysis_duration_ms: 1100,
  },
];

export function seedTweets() {
  console.log('Seeding sample tweets...');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO tweets
    (twitter_user_id, tweet_id, content, tweet_timestamp, engagement_metrics, is_retweet, is_reply)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const tweet of sampleTweets) {
    const result = insert.run(
      tweet.twitter_user_id,
      tweet.tweet_id,
      tweet.content,
      tweet.tweet_timestamp,
      tweet.engagement_metrics,
      tweet.is_retweet,
      tweet.is_reply
    );
    if (result.changes > 0) {
      inserted++;
    }
  }

  console.log(`Seeded ${inserted} new tweets (${sampleTweets.length - inserted} already existed)`);
  return inserted;
}

export function seedLLMModels() {
  console.log('Seeding sample LLM model...');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO llm_models
    (name, version, provider, huggingface_model_id, is_local, is_enabled, download_status, disk_size_bytes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    sampleModel.name,
    sampleModel.version,
    sampleModel.provider,
    sampleModel.huggingface_model_id,
    sampleModel.is_local,
    sampleModel.is_enabled,
    sampleModel.download_status,
    sampleModel.disk_size_bytes
  );

  if (result.changes > 0) {
    console.log('Seeded 1 new LLM model');
    return 1;
  }
  console.log('LLM model already existed');
  return 0;
}

export function seedSentimentAnalyses() {
  console.log('Seeding sample sentiment analyses...');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO sentiment_analyses
    (tweet_id, llm_model_id, emotion_scores, analysis_duration_ms)
    VALUES (?, ?, ?, ?)
  `);

  // Check if analyses already exist
  const existing = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get() as { count: number };
  if (existing.count > 0) {
    console.log('Sentiment analyses already exist, skipping...');
    return 0;
  }

  let inserted = 0;
  for (const analysis of sampleAnalyses) {
    const result = insert.run(
      analysis.tweet_id,
      analysis.llm_model_id,
      analysis.emotion_scores,
      analysis.analysis_duration_ms
    );
    if (result.changes > 0) {
      inserted++;
    }
  }

  console.log(`Seeded ${inserted} new sentiment analyses`);
  return inserted;
}

export function seedAll() {
  seedUsers();
  seedTweets();
  seedLLMModels();
  seedSentimentAnalyses();
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedAll();
}
