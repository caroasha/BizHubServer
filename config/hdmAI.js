const axios = require('axios');
const env = require('./env');

// ============================================
// HDM AI - Connection Config Only
// ============================================

const hdmAIClient = axios.create({
  baseURL: env.HDM_AI_BASE_URL || 'https://hdmaiserver.pxxl.click/api/v1',
  headers: {
    'Authorization': `Bearer ${env.HDM_AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

module.exports = hdmAIClient;