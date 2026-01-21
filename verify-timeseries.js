// Script to verify Feature #221: Time series data for charts accurate
// This verifies that chart data matches time bucket values

const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const userId = 4; // Sam Altman

  console.log('=== Feature #221: Time Series Data Verification ===\n');

  // Step 1: Get the trends API data
  console.log('Step 1: Query time series aggregations from API...');
  const trendsData = await fetch(`http://localhost:3001/api/users/${userId}/trends?timeBucket=daily`);
  console.log(`  - Time bucket: ${trendsData.timeBucket}`);
  console.log(`  - Data points: ${trendsData.dataPoints.length}`);
  console.log(`  - Emotions tracked: ${trendsData.emotions.length}`);

  // Step 2: Get raw tweets data
  console.log('\nStep 2: Query raw tweet data...');
  const tweetsData = await fetch(`http://localhost:3001/api/users/${userId}/tweets?limit=100`);
  console.log(`  - Total tweets: ${tweetsData.pagination.total}`);

  // Step 3: Manually calculate time bucket aggregations
  console.log('\nStep 3: Calculate averages manually from raw data...');

  // Group tweets by date
  const byDate = {};
  for (const tweet of tweetsData.tweets) {
    const date = tweet.tweetTimestamp.split('T')[0];
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(tweet);
  }

  // Calculate averages for each date
  const manualAverages = {};
  for (const [date, tweets] of Object.entries(byDate)) {
    const emotionSums = {};
    const emotionCounts = {};

    for (const tweet of tweets) {
      if (tweet.combinedEmotions) {
        for (const [emotion, value] of Object.entries(tweet.combinedEmotions)) {
          if (typeof value === 'number') {
            emotionSums[emotion] = (emotionSums[emotion] || 0) + value;
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          }
        }
      }
    }

    manualAverages[date] = {};
    for (const emotion of Object.keys(emotionSums)) {
      manualAverages[date][emotion] = Math.round(emotionSums[emotion] / emotionCounts[emotion]);
    }
  }

  // Step 4: Compare API data to manual calculations
  console.log('\nStep 4: Compare data points to verify accuracy...\n');

  let allMatch = true;
  const emotionsToCheck = ['happy', 'excited', 'thankful', 'inspirational']; // Top 4 selected

  // Check each data point from the API
  for (const apiPoint of trendsData.dataPoints) {
    const date = apiPoint.timestamp;
    const manual = manualAverages[date];

    if (!manual) {
      // This date might have analyses but no tweets in our limited query
      // That's OK - API might have more data
      continue;
    }

    let dateMatches = true;
    const differences = [];

    for (const emotion of emotionsToCheck) {
      const apiValue = apiPoint.emotions[emotion];
      const manualValue = manual[emotion];

      if (apiValue !== undefined && manualValue !== undefined) {
        if (apiValue !== manualValue) {
          dateMatches = false;
          differences.push(`${emotion}: api=${apiValue}, manual=${manualValue}, diff=${Math.abs(apiValue - manualValue)}`);
        }
      }
    }

    if (dateMatches) {
      console.log(`  ${date}: ✓ MATCH`);
    } else {
      console.log(`  ${date}: ✗ MISMATCH`);
      for (const diff of differences) {
        console.log(`    - ${diff}`);
      }
      allMatch = false;
    }
  }

  // Step 5: Detailed verification for a specific date
  console.log('\n=== Detailed Verification for Sample Date ===');

  // Pick a date with multiple tweets
  const sampleDates = Object.keys(byDate).filter(d => byDate[d].length > 1);
  if (sampleDates.length > 0) {
    const sampleDate = sampleDates[0];
    console.log(`\nDate: ${sampleDate} (${byDate[sampleDate].length} analyses)`);

    // Show raw values
    console.log('\nRaw emotion values from tweets:');
    for (const tweet of byDate[sampleDate]) {
      if (tweet.combinedEmotions) {
        const happy = tweet.combinedEmotions.happy;
        const excited = tweet.combinedEmotions.excited;
        console.log(`  Tweet ${tweet.id}: happy=${happy}, excited=${excited}`);
      }
    }

    // Show manual calculation
    console.log('\nManual average calculation:');
    const happyValues = byDate[sampleDate].map(t => t.combinedEmotions?.happy).filter(v => v !== undefined);
    const excitedValues = byDate[sampleDate].map(t => t.combinedEmotions?.excited).filter(v => v !== undefined);

    if (happyValues.length > 0) {
      const happySum = happyValues.reduce((a, b) => a + b, 0);
      const happyAvg = Math.round(happySum / happyValues.length);
      console.log(`  happy: sum=${happySum}, count=${happyValues.length}, avg=${happyAvg}`);
    }

    if (excitedValues.length > 0) {
      const excitedSum = excitedValues.reduce((a, b) => a + b, 0);
      const excitedAvg = Math.round(excitedSum / excitedValues.length);
      console.log(`  excited: sum=${excitedSum}, count=${excitedValues.length}, avg=${excitedAvg}`);
    }

    // Show API value
    const apiPoint = trendsData.dataPoints.find(p => p.timestamp === sampleDate);
    if (apiPoint) {
      console.log('\nAPI returned values:');
      console.log(`  happy: ${apiPoint.emotions.happy}`);
      console.log(`  excited: ${apiPoint.emotions.excited}`);
    }
  }

  console.log('\n=== FINAL RESULT ===');
  if (allMatch) {
    console.log('✓ ALL TIME SERIES DATA POINTS MATCH MANUAL CALCULATIONS');
    console.log('Feature #221 VERIFIED - Time series data for charts is accurate');
  } else {
    console.log('✗ SOME DATA POINTS DO NOT MATCH');
    console.log('Feature #221 needs investigation');
  }
}

main().catch(console.error);
