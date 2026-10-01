const dayjs = require('dayjs');

// ============================================
// Business ID Generators
// ============================================

const prefixes = {
  restaurant: 'RTO',
  pharmacy: 'PHM',
  apartment: 'APT',
  electronics: 'ELC',
  cyber: 'CYB',
};

const getDateString = () => dayjs().format('YYMMDD');

const padSequence = (num) => String(num).padStart(4, '0');

/**
 * Generate order number
 * Format: RTO-260711-0001
 */
const generateOrderNo = (module, sequence) => {
  const prefix = prefixes[module] || 'ORD';
  return `${prefix}-${getDateString()}-${padSequence(sequence)}`;
};

/**
 * Generate invoice number
 * Format: INV-RTO-260711-0001
 */
const generateInvoiceNo = (module, sequence) => {
  const prefix = prefixes[module] || 'ORD';
  return `INV-${prefix}-${getDateString()}-${padSequence(sequence)}`;
};

/**
 * Generate receipt number
 * Format: RCP-RTO-260711-0001
 */
const generateReceiptNo = (module, sequence) => {
  const prefix = prefixes[module] || 'ORD';
  return `RCP-${prefix}-${getDateString()}-${padSequence(sequence)}`;
};

/**
 * Generate tenant slug from business name
 */
const generateTenantSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
};

module.exports = {
  generateOrderNo,
  generateInvoiceNo,
  generateReceiptNo,
  generateTenantSlug,
};