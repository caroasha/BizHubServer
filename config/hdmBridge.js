const axios = require('axios');
const env = require('./env');

// ============================================
// HDM Bridge - Connection Config Only
// ============================================

const hdmBridgeClient = axios.create({
  baseURL: env.HDM_API_URL || 'https://api.hdmbridge.com/api',
  headers: {
    'Authorization': `Bearer ${env.HDM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

module.exports = hdmBridgeClient;