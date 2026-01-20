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

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedUsers();
}
