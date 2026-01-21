// Debug script to check session timeout
const { config } = require('./backend/node_modules/dotenv');
const path = require('path');

// Load .env from backend directory
config({ path: path.join(__dirname, 'backend', '.env') });

console.log('Environment variables:');
console.log('  SESSION_TIMEOUT_SECONDS:', process.env.SESSION_TIMEOUT_SECONDS);
console.log('  SESSION_TIMEOUT_HOURS:', process.env.SESSION_TIMEOUT_HOURS);

// Calculate timeout like backend does
const getSessionTimeoutMs = () => {
  if (process.env.SESSION_TIMEOUT_SECONDS) {
    return parseInt(process.env.SESSION_TIMEOUT_SECONDS, 10) * 1000;
  }
  const sessionTimeoutHours = parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10);
  return sessionTimeoutHours * 60 * 60 * 1000;
};

console.log('  Calculated timeout (ms):', getSessionTimeoutMs());
console.log('  Calculated timeout (hours):', getSessionTimeoutMs() / (60 * 60 * 1000));
