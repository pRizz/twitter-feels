const http = require('http');

const userId = process.argv[2] || 1;

http.get(`http://localhost:3001/api/users/${userId}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const user = JSON.parse(data);
      console.log('=== API Response Validation for /api/users/' + userId + ' ===\n');

      // Check required fields
      const requiredFields = ['id', 'twitter_id', 'username', 'display_name', 'bio', 'avatar_url',
                             'follower_count', 'following_count', 'is_active', 'created_at', 'updated_at',
                             'aggregations', 'emotionAverages', 'emotionColors', 'analysisCount', 'tweetCount'];

      console.log('1. REQUIRED FIELDS CHECK:');
      let allFieldsPresent = true;
      for (const field of requiredFields) {
        const present = field in user;
        console.log(`   - ${field}: ${present ? '✓ present' : '✗ MISSING'}`);
        if (!present) allFieldsPresent = false;
      }
      console.log(`   Result: ${allFieldsPresent ? 'PASS' : 'FAIL'}\n`);

      // Check aggregations structure
      console.log('2. AGGREGATIONS STRUCTURE:');
      console.log(`   - Type: ${Array.isArray(user.aggregations) ? 'Array ✓' : 'Not Array ✗'}`);
      console.log(`   - Length: ${user.aggregations?.length || 0}`);
      console.log(`   Result: ${Array.isArray(user.aggregations) ? 'PASS' : 'FAIL'}\n`);

      // Check emotionAverages structure
      console.log('3. EMOTION AVERAGES STRUCTURE:');
      const emotions = user.emotionAverages || {};
      const emotionNames = Object.keys(emotions);
      console.log(`   - Type: ${typeof emotions === 'object' ? 'Object ✓' : 'Not Object ✗'}`);
      console.log(`   - Emotions found: ${emotionNames.join(', ')}`);

      let allValidNumbers = true;
      for (const [name, score] of Object.entries(emotions)) {
        const isValidNumber = typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 100;
        if (!isValidNumber) {
          console.log(`   - ${name}: ${score} (INVALID - not a number 0-100)`);
          allValidNumbers = false;
        }
      }
      if (allValidNumbers) {
        console.log('   - All emotion scores are valid numbers (0-100) ✓');
      }
      console.log(`   Result: ${allValidNumbers ? 'PASS' : 'FAIL'}\n`);

      // Check emotionColors structure
      console.log('4. EMOTION COLORS STRUCTURE:');
      const colors = user.emotionColors || {};
      const hasColors = typeof colors === 'object' && Object.keys(colors).length > 0;
      let allValidColors = true;
      for (const [name, colorObj] of Object.entries(colors)) {
        const hasColorProp = colorObj && typeof colorObj.color === 'string';
        if (!hasColorProp) {
          console.log(`   - ${name}: INVALID - missing color property`);
          allValidColors = false;
        }
      }
      if (allValidColors && hasColors) {
        console.log('   - All emotions have valid color objects ✓');
      }
      console.log(`   Result: ${hasColors && allValidColors ? 'PASS' : 'FAIL'}\n`);

      // Summary
      console.log('=== OVERALL VALIDATION ===');
      const allPassed = allFieldsPresent && Array.isArray(user.aggregations) && allValidNumbers && hasColors && allValidColors;
      console.log(`Status: ${allPassed ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗'}`);

      console.log('\n=== FORMATTED RESPONSE ===');
      console.log(JSON.stringify(user, null, 2));

    } catch (e) {
      console.error('Failed to parse response:', e.message);
      console.error('Raw response:', data);
    }
  });
}).on('error', (e) => {
  console.error('Request failed:', e.message);
});
