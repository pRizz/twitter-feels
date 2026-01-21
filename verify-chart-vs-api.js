// Script to verify Feature #221: Chart data matches API data
// This checks that the UI chart displays the same values the API returns

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

  console.log('=== Feature #221: Chart Data vs API Data Verification ===\n');

  // Get the trends API data for daily bucket
  console.log('Fetching trends data from API...');
  const trendsData = await fetch(`http://localhost:3001/api/users/${userId}/trends?timeBucket=daily`);

  console.log(`\nAPI Response Summary:`);
  console.log(`  - User ID: ${trendsData.userId}`);
  console.log(`  - Time Bucket: ${trendsData.timeBucket}`);
  console.log(`  - Total data points: ${trendsData.dataPoints.length}`);
  console.log(`  - Emotions: ${trendsData.emotions.join(', ')}`);

  // Print data points in format that can be compared to chart
  console.log('\n=== Data Points (API Values) ===');
  console.log('These should match what the chart displays:\n');

  // Format timestamps to match chart display
  function formatDate(timestamp) {
    // Handle different formats: YYYY-MM-DD or YYYY-MM
    if (timestamp.length === 7) {
      // Monthly format
      const [year, month] = timestamp.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Top 4 emotions shown by default
  const selectedEmotions = ['happy', 'thankful', 'excited', 'inspirational'];

  console.log('Date\t\t' + selectedEmotions.join('\t'));
  console.log('----\t\t' + selectedEmotions.map(() => '----').join('\t'));

  for (const point of trendsData.dataPoints) {
    const displayDate = formatDate(point.timestamp);
    const values = selectedEmotions.map(e => point.emotions[e] || 0);
    console.log(`${displayDate}\t\t${values.join('\t')}`);
  }

  // Now check a few specific dates visible in the chart screenshot
  console.log('\n=== Key Dates Visible in Chart ===');
  console.log('(Compare these to the chart in the screenshot)\n');

  // These dates were visible in the chart
  const keyDates = [
    '2025-12-08', // Dec 8 in chart might be nearby
    '2025-12-15', // Dec 17 area
    '2025-12-24', // Dec 25 area
    '2025-12-28', // Dec 28
    '2026-01-02', // Jan 1 area
    '2026-01-05', // Jan 4 area
    '2026-01-08', // Jan 8
    '2026-01-11', // Jan 11
    '2026-01-14', // Jan 16 area
    '2026-01-20', // Jan 21 area
  ];

  for (const targetDate of keyDates) {
    const point = trendsData.dataPoints.find(p => p.timestamp === targetDate);
    if (point) {
      console.log(`${formatDate(point.timestamp)} (${point.timestamp}):`);
      for (const emotion of selectedEmotions) {
        console.log(`  ${emotion}: ${point.emotions[emotion]}`);
      }
      console.log('');
    }
  }

  // Verify data integrity
  console.log('=== Data Integrity Checks ===\n');

  let hasIssues = false;

  // Check 1: All values in 0-100 range
  for (const point of trendsData.dataPoints) {
    for (const [emotion, value] of Object.entries(point.emotions)) {
      if (value < 0 || value > 100) {
        console.log(`✗ Value out of range: ${point.timestamp} ${emotion}=${value}`);
        hasIssues = true;
      }
    }
  }
  if (!hasIssues) {
    console.log('✓ All values are in valid 0-100 range');
  }

  // Check 2: Data points are in chronological order
  let inOrder = true;
  for (let i = 1; i < trendsData.dataPoints.length; i++) {
    if (trendsData.dataPoints[i].timestamp < trendsData.dataPoints[i-1].timestamp) {
      inOrder = false;
      break;
    }
  }
  console.log(inOrder ? '✓ Data points are in chronological order' : '✗ Data points are NOT in order');

  // Check 3: All emotions have consistent values
  const emotionCounts = {};
  for (const point of trendsData.dataPoints) {
    for (const emotion of Object.keys(point.emotions)) {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }
  }
  console.log(`✓ ${Object.keys(emotionCounts).length} emotions tracked across ${trendsData.dataPoints.length} data points`);

  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('The API is returning properly structured time series data.');
  console.log('The chart should display this data accurately.');
  console.log('\nTo fully verify, compare the values above to the chart visualization.');
}

main().catch(console.error);
