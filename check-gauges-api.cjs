const http = require('http');

const url = 'http://localhost:3001/api/dashboard?timeBucket=weekly&modelId=combined';

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Gauges from API:');
    console.log(JSON.stringify(json.gauges, null, 2));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
