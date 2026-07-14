const axios = require('axios');
const env = require('./env');

// ============================================
// Brevo - Connection Config Only
// ============================================

const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': env.BREVO_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

module.exports = brevoClient;