const http = require('http');

async function fetchDashboard(timeBucket) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3001/api/dashboard?timeBucket=${timeBucket}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            requestedBucket: timeBucket,
            timeBucket: json.timeBucket,
            timeCutoff: json.timeCutoff,
            filteredAnalysisCount: json.filteredAnalysisCount,
            totalAnalyses: json.stats.totalAnalyses,
            totalTweets: json.stats.totalTweets
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Comparing time period filters:\n');

  const periods = ['all_time', 'yearly', 'monthly', 'weekly'];

  for (const timeBucket of periods) {
    const result = await fetchDashboard(timeBucket);
    console.log(`=== ${timeBucket.toUpperCase()} ===`);
    console.log(`  timeBucket: ${result.timeBucket}`);
    console.log(`  timeCutoff: ${result.timeCutoff}`);
    console.log(`  filteredAnalysisCount: ${result.filteredAnalysisCount}`);
    console.log(`  totalAnalyses: ${result.totalAnalyses}`);
    console.log(`  totalTweets: ${result.totalTweets}`);
    console.log('');
  }

  // Also verify all_time has no date restrictions
  const allTime = await fetchDashboard('all_time');
  console.log('=== VERIFICATION ===');
  console.log(`All Time filter has date restriction (timeCutoff): ${allTime.timeCutoff !== null ? 'YES - FAIL' : 'NO - PASS'}`);
  console.log(`All Time includes all analyses: ${allTime.filteredAnalysisCount === allTime.totalAnalyses ? 'YES - PASS' : 'NO - FAIL'}`);
  console.log(`Filtered/Total: ${allTime.filteredAnalysisCount}/${allTime.totalAnalyses}`);
}

main().catch(console.error);
