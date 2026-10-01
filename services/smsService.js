const env = require('../config/env');
const logger = require('../utils/logger');
const brevoClient = require('../config/brevo');
const hdmBridgeClient = require('../config/hdmBridge');

let settingsCache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

const loadSettings = async () => {
  if (settingsCache && Date.now() - cacheAt < CACHE_MS) return settingsCache;
  try {
    const Settings = require('../models/admin/Settings');
    const docs = await Settings.find({
      key: { $in: ['sms_provider', 'sms_sender_id', 'sms_enabled'] },
    }).lean();
    const map = {};
    docs.forEach((d) => { map[d.key] = d.value; });
    settingsCache = map;
    cacheAt = Date.now();
    return map;
  } catch {
    return {};
  }
};

const getConfig = async () => {
  const s = await loadSettings();
  return {
    enabled: s.sms_enabled !== 'false',
    provider: s.sms_provider || env.SMS_PROVIDER || 'hdmBridge',
    senderId: s.sms_sender_id || env.APP_NAME || 'BizHub',
  };
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0')) p = `254${p.slice(1)}`;
  if (p.startsWith('+')) p = p.slice(1);
  if (!p.startsWith('254') && p.length === 9) p = `254${p}`;
  return p;
};

const normalizeParams = (args) => {
  if (args.length === 1 && typeof args[0] === 'object') return args[0];
  if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    return { to: args[0], message: args[1] };
  }
  return {};
};

/**
 * Render a template. Throws if the template name is not found —
 * no silent fallback to the template name as content.
 */
const renderTemplate = async (templates, name, data) => {
  if (typeof name === 'string') {
    if (!templates[name]) {
      throw new Error(`SMS template not found: ${name}`);
    }
    const result = await templates[name](data || {});
    return { message: typeof result === 'string' ? result : result.message || '' };
  }
  if (typeof name === 'object' && name?.message) return { message: name.message };
  throw new Error('Invalid SMS template');
};

const sendViaBrevo = async ({ to, message }) => {
  const config = await getConfig();
  try {
    const payload = {
      sender: config.senderId,
      recipient: to,
      content: message,
    };
    const res = await brevoClient.post('/transactionalSMS/sms', payload);
    logger.info('SMS sent via Brevo', { to, messageId: res.data?.messageId });
    return { success: true, messageId: res.data?.messageId, provider: 'brevo' };
  } catch (err) {
    logger.error('Brevo SMS failed', {
      to,
      status: err.response?.status,
      error: err.response?.data || err.message,
    });
    return { success: false, error: err.response?.data?.message || err.message, provider: 'brevo' };
  }
};

/**
 * HDM Bridge expects { from, to, content }.
 * (Previously sent `message` — HDM rejected with VALIDATION_001:
 *  "to and content are required".)
 */
const sendViaHDM = async ({ to, message }) => {
  const config = await getConfig();
  try {
    const payload = {
      from: config.senderId,
      to,
      content: message,
    };
    const res = await hdmBridgeClient.post('/sms/send', payload);
    logger.info('SMS sent via HDM Bridge', { to, messageId: res.data?.id });
    return { success: true, messageId: res.data?.id, provider: 'hdmBridge' };
  } catch (err) {
    logger.error('HDM Bridge SMS failed', {
      to,
      status: err.response?.status,
      error: err.response?.data || err.message,
    });
    return { success: false, error: err.response?.data?.message || err.message, provider: 'hdmBridge' };
  }
};

const send = async (...args) => {
  const params = normalizeParams(args);

  if (!params.to) {
    logger.warn('SMS skipped: no recipient');
    return { success: false, error: 'No recipient' };
  }

  if (!params.message || typeof params.message !== 'string') {
    logger.error('SMS skipped: invalid message', { to: params.to });
    return { success: false, error: 'Invalid message' };
  }

  const config = await getConfig();
  if (!config.enabled) {
    logger.info('SMS skipped: globally disabled', { to: params.to });
    return { success: false, error: 'SMS disabled' };
  }

  const to = normalizePhone(params.to);
  if (!to || to.length < 11) {
    logger.error('SMS skipped: invalid phone number', { raw: params.to });
    return { success: false, error: 'Invalid phone' };
  }

  let message = params.message;
  if (message.length > 480) {
    logger.warn('SMS message truncated', { to, original: message.length });
    message = message.substring(0, 477) + '...';
  }

  const payload = { to, message };

  if (config.provider === 'brevo') return sendViaBrevo(payload);
  return sendViaHDM(payload);
};

const sendTemplate = async (templateName, to, data) => {
  try {
    const templates = require('../templates/smsTemplates');
    const rendered = await renderTemplate(templates, templateName, data);
    return send({ to, message: rendered.message });
  } catch (err) {
    logger.error('SMS template render failed', {
      template: templateName,
      to,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

const sendBulk = async (recipients, message) => {
  const results = await Promise.allSettled(
    recipients.map((to) => send({ to, message }))
  );
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const failed = recipients.length - sent;
  logger.info('Bulk SMS complete', { sent, failed, total: recipients.length });
  return { success: failed === 0, sent, failed, total: recipients.length };
};

const verifyProvider = async () => {
  const config = await getConfig();
  return { provider: config.provider, enabled: config.enabled, senderId: config.senderId };
};

module.exports = {
  send,
  sendTemplate,
  sendBulk,
  verifyProvider,
  getConfig,
  normalizePhone,
};