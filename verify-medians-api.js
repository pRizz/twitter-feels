// This script verifies the median calculation by fetching data from the API
// and manually calculating medians to compare

const fs = require('fs');

// Tweets data extracted from the API response (33 tweets with combinedEmotions, some tweets have multiple analyses)
// Note: The API says 41 analyses for 33 tweets, meaning some tweets have multiple analysis models
// For this verification, we use the combinedEmotions from each tweet which represents the aggregated sentiment

const tweetsWithEmotions = [
  {happy:45,sad:15,angry:10,fearful:5,hatred:2,thankful:35,excited:60,hopeful:50,frustrated:20,sarcastic:25,inspirational:55,anxious:12},
  {happy:28,sad:21,angry:18,fearful:16,hatred:12,thankful:59,excited:39,hopeful:18,frustrated:30,sarcastic:17,inspirational:32,anxious:19},
  {happy:24,sad:29,angry:3,fearful:17,hatred:6,thankful:63,excited:52,hopeful:49,frustrated:34,sarcastic:21,inspirational:8,anxious:31},
  {happy:40,sad:44,angry:16,fearful:26,hatred:7,thankful:77,excited:70,hopeful:55,frustrated:38,sarcastic:26,inspirational:6,anxious:23},
  {happy:12,sad:7,angry:9,fearful:25,hatred:13,thankful:1,excited:34,hopeful:66,frustrated:42,sarcastic:12,inspirational:11,anxious:17},
  {happy:48,sad:23,angry:26,fearful:3,hatred:19,thankful:21,excited:79,hopeful:26,frustrated:26,sarcastic:8,inspirational:8,anxious:8},
  {happy:87,sad:36,angry:32,fearful:7,hatred:5,thankful:43,excited:16,hopeful:10,frustrated:23,sarcastic:14,inspirational:38,anxious:5},
  {happy:79,sad:34,angry:29,fearful:23,hatred:14,thankful:64,excited:86,hopeful:25,frustrated:21,sarcastic:28,inspirational:6,anxious:28},
  {happy:88,sad:45,angry:18,fearful:28,hatred:10,thankful:3,excited:83,hopeful:2,frustrated:14,sarcastic:1,inspirational:35,anxious:7},
  {happy:85,sad:31,angry:8,fearful:27,hatred:14,thankful:23,excited:42,hopeful:59,frustrated:22,sarcastic:28,inspirational:7,anxious:8},
  {happy:66,sad:24,angry:8,fearful:3,hatred:10,thankful:43,excited:30,hopeful:65,frustrated:16,sarcastic:20,inspirational:44,anxious:29},
  {happy:16,sad:7,angry:21,fearful:28,hatred:9,thankful:0,excited:69,hopeful:14,frustrated:27,sarcastic:32,inspirational:6,anxious:14},
  {happy:85,sad:26,angry:39,fearful:4,hatred:17,thankful:7,excited:28,hopeful:4,frustrated:34,sarcastic:11,inspirational:51,anxious:39},
  {happy:90,sad:20,angry:30,fearful:10,hatred:1,thankful:33,excited:9,hopeful:36,frustrated:37,sarcastic:31,inspirational:42,anxious:17},
  {happy:31,sad:44,angry:30,fearful:9,hatred:13,thankful:33,excited:63,hopeful:4,frustrated:18,sarcastic:17,inspirational:27,anxious:22},
  {happy:0,sad:26,angry:7,fearful:16,hatred:16,thankful:75,excited:36,hopeful:51,frustrated:0,sarcastic:24,inspirational:49,anxious:3},
  {happy:27,sad:7,angry:8,fearful:18,hatred:14,thankful:33,excited:62,hopeful:8,frustrated:39,sarcastic:17,inspirational:14,anxious:36},
  {happy:86,sad:45,angry:25,fearful:17,hatred:18,thankful:72,excited:88,hopeful:15,frustrated:10,sarcastic:17,inspirational:25,anxious:23},
  {happy:13,sad:42,angry:25,fearful:3,hatred:5,thankful:43,excited:54,hopeful:48,frustrated:46,sarcastic:6,inspirational:52,anxious:14},
  {happy:79,sad:30,angry:34,fearful:14,hatred:0,thankful:38,excited:49,hopeful:56,frustrated:13,sarcastic:9,inspirational:28,anxious:10},
  {happy:87,sad:17,angry:3,fearful:9,hatred:7,thankful:14,excited:63,hopeful:34,frustrated:45,sarcastic:28,inspirational:8,anxious:26},
  {happy:12,sad:3,angry:31,fearful:12,hatred:7,thankful:74,excited:21,hopeful:13,frustrated:46,sarcastic:7,inspirational:15,anxious:10},
  {happy:36,sad:28,angry:33,fearful:23,hatred:9,thankful:39,excited:41,hopeful:44,frustrated:30,sarcastic:14,inspirational:43,anxious:29},
  {happy:52,sad:19,angry:38,fearful:10,hatred:7,thankful:38,excited:60,hopeful:6,frustrated:33,sarcastic:18,inspirational:55,anxious:8},
  {happy:45,sad:24,angry:17,fearful:9,hatred:8,thankful:41,excited:47,hopeful:24,frustrated:27,sarcastic:11,inspirational:25,anxious:13},
  {happy:15,sad:11,angry:26,fearful:12,hatred:19,thankful:34,excited:44,hopeful:8,frustrated:11,sarcastic:31,inspirational:56,anxious:21},
  {happy:1,sad:17,angry:20,fearful:26,hatred:4,thankful:72,excited:84,hopeful:51,frustrated:2,sarcastic:11,inspirational:57,anxious:2},
  {happy:27,sad:28,angry:29,fearful:24,hatred:9,thankful:2,excited:78,hopeful:30,frustrated:1,sarcastic:9,inspirational:52,anxious:22},
  {happy:95,sad:33,angry:29,fearful:8,hatred:2,thankful:33,excited:72,hopeful:29,frustrated:11,sarcastic:9,inspirational:63,anxious:21},
  {happy:71,sad:20,angry:0,fearful:16,hatred:1,thankful:46,excited:70,hopeful:56,frustrated:32,sarcastic:3,inspirational:63,anxious:20},
  {happy:28,sad:25,angry:13,fearful:20,hatred:0,thankful:26,excited:48,hopeful:3,frustrated:25,sarcastic:1,inspirational:40,anxious:30},
  {happy:24,sad:27,angry:13,fearful:7,hatred:19,thankful:43,excited:35,hopeful:4,frustrated:29,sarcastic:10,inspirational:50,anxious:34},
  {happy:7,sad:16,angry:37,fearful:29,hatred:16,thankful:16,excited:26,hopeful:36,frustrated:43,sarcastic:18,inspirational:1,anxious:16}
];

// Note: The above represents the combined emotions from each unique tweet
// But the API uses sentiment_analyses table which may have multiple analyses per tweet
// Let's work with all 41 analyses - we need to account for multiple analyses per tweet

// Actually, looking at the API response more carefully:
// - Tweet 128 has analysisCount: 3
// - Tweet 127 has analysisCount: 2
// - Tweet 126 has analysisCount: 3
// - Tweet 129 has analysisCount: 4
// - All others have analysisCount: 1
// Total: 1 + 3 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 3 + 1 + 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 41

// For the median calculation in the backend, it uses data from sentiment_analyses table,
// where each analysis has its own emotion_scores. The combinedEmotions shown is likely
// an average of those analyses for display purposes.

// Let me verify with just the data we have - the 33 unique tweet combined emotions
// This should give us a baseline understanding

const emotions = ['happy','sad','angry','fearful','hatred','thankful','excited','hopeful','frustrated','sarcastic','inspirational','anxious'];

// Calculate median from array of numbers
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

// Calculate medians for all emotions
function calculateMedians(tweets) {
  const medians = {};
  emotions.forEach(emotion => {
    const values = tweets.map(t => t[emotion]);
    medians[emotion] = calculateMedian(values);
  });
  return medians;
}

// API returned medians for Sam Altman (41 analyses)
const apiMedians = {"happy":40,"sad":25,"angry":23,"fearful":15,"hatred":9,"thankful":38,"excited":52,"hopeful":28,"frustrated":26,"sarcastic":14,"inspirational":31,"anxious":17};

// Calculate from 33 tweets (using combined emotions)
const manualMedians = calculateMedians(tweetsWithEmotions);

console.log('=== Sam Altman Median Verification ===\n');
console.log('Tweet count: 33 tweets');
console.log('Analysis count (from API): 41 analyses\n');

console.log('Manual Calculation (from 33 tweet combinedEmotions):');
console.log(JSON.stringify(manualMedians, null, 2));

console.log('\nAPI Medians (from 41 analyses):');
console.log(JSON.stringify(apiMedians, null, 2));

console.log('\n=== Comparison ===');
let matchCount = 0;
let closeCount = 0;
emotions.forEach(emotion => {
  const manual = manualMedians[emotion];
  const api = apiMedians[emotion];
  const diff = Math.abs(manual - api);
  let status;
  if (diff === 0) {
    status = '✓ EXACT MATCH';
    matchCount++;
  } else if (diff <= 3) {
    status = '~ CLOSE (diff=' + diff + ')';
    closeCount++;
  } else {
    status = '✗ DIFFERENT (diff=' + diff + ')';
  }
  console.log(`${emotion}: manual=${manual}, api=${api} ${status}`);
});

console.log('\n========================================');
console.log(`RESULT: ${matchCount} exact matches, ${closeCount} close matches (diff <= 3)`);
console.log('========================================');

// Detailed calculation for 'happy' to verify
console.log('\n=== Detailed Happy Median Calculation ===');
const happyValues = tweetsWithEmotions.map(t => t.happy);
console.log('Raw happy values (33 values):', happyValues.join(', '));
const sortedHappy = [...happyValues].sort((a, b) => a - b);
console.log('Sorted:', sortedHappy.join(', '));
console.log('Length:', sortedHappy.length, '(odd, so median is middle value at index', Math.floor(sortedHappy.length / 2) + ')');
console.log('Manual median value:', sortedHappy[Math.floor(sortedHappy.length / 2)]);
console.log('API median value:', apiMedians.happy);
