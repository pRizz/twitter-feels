// Verify Feature #81: User detail shows real emotion averages
// Run with: node --experimental-specifier-resolution=node verify-feature-81.js

const emotions = ['happy', 'sad', 'angry', 'fearful', 'hatred', 'thankful', 'excited', 'hopeful', 'frustrated', 'sarcastic', 'inspirational', 'anxious'];

async function verify() {
  const userId = 46; // elonmusk

  // Fetch API response
  console.log('=== Fetching API Response for User 46 (elonmusk) ===');
  const response = await fetch(`http://localhost:3001/api/users/${userId}`);
  const apiData = await response.json();

  console.log('\n=== API Emotion Averages ===');
  console.log(JSON.stringify(apiData.emotionAverages, null, 2));

  console.log('\n=== Tweet and Analysis Counts ===');
  console.log(`Tweet count: ${apiData.tweetCount}`);
  console.log(`Analysis count: ${apiData.analysisCount}`);

  // Check if averages exist and are numbers
  console.log('\n=== Validation ===');
  let valid = true;

  if (!apiData.emotionAverages) {
    console.log('ERROR: emotionAverages is missing');
    valid = false;
  } else {
    for (const emotion of emotions) {
      const value = apiData.emotionAverages[emotion];
      if (typeof value !== 'number') {
        console.log(`ERROR: ${emotion} is not a number: ${value}`);
        valid = false;
      } else if (value < 0 || value > 100) {
        console.log(`ERROR: ${emotion} is out of range [0-100]: ${value}`);
        valid = false;
      } else {
        console.log(`✓ ${emotion}: ${value}`);
      }
    }
  }

  // Check that counts are positive (data exists)
  if (apiData.analysisCount <= 0) {
    console.log('ERROR: No sentiment analyses found');
    valid = false;
  }

  if (apiData.tweetCount <= 0) {
    console.log('ERROR: No tweets found');
    valid = false;
  }

  console.log('\n=== Result ===');
  if (valid && apiData.analysisCount > 0) {
    console.log('PASS: User detail shows real emotion averages');
    console.log(`Data derived from ${apiData.analysisCount} sentiment analyses on ${apiData.tweetCount} tweets`);
  } else {
    console.log('FAIL: Issues found with emotion averages');
  }
}

verify().catch(console.error);
