const dayjs = require('dayjs');
const env = require('../config/env');

// ============================================
// Data Formatters
// ============================================

/**
 * Format currency
 * @param {number} amount
 * @param {string} currency - KES, USD, etc.
 * @returns {string} - "KES 1,500.00"
 */
const formatCurrency = (amount, currency = env.APP_CURRENCY) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date
 * @param {Date|string} date
 * @param {string} formatType - 'short' | 'long' | 'time' | 'datetime'
 * @returns {string}
 */
const formatDate = (date, formatType = 'short') => {
  const d = dayjs(date);
  const formats = {
    short: 'DD/MM/YYYY',
    long: 'DD MMMM YYYY',
    time: 'HH:mm',
    datetime: 'DD/MM/YYYY HH:mm',
    iso: 'YYYY-MM-DD',
  };
  return d.format(formats[formatType] || 'short');
};

/**
 * Format phone number to local format
 * @param {string} phone
 * @param {string} format - 'local' | 'int'
 * @returns {string}
 */
const formatPhone = (phone, format = 'local') => {
  const cleaned = phone.replace(/\D/g, '');

  if (format === 'int') {
    if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
    if (cleaned.startsWith('254')) return `+${cleaned}`;
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('254')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('+254')) return `0${cleaned.slice(4)}`;
  return `0${cleaned.slice(-9)}`;
};

/**
 * Format percentage
 * @param {number} value - 0.156
 * @returns {string} - "15.6%"
 */
const formatPercentage = (value) => {
  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Truncate text
 * @param {string} text
 * @param {number} length
 * @returns {string}
 */
const truncate = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

module.exports = {
  formatCurrency,
  formatDate,
  formatPhone,
  formatPercentage,
  truncate,
};