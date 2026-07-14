const env = require('../config/env');
const logger = require('../utils/logger');
const brevoClient = require('../config/brevo');
const hdmBridgeClient = require('../config/hdmBridge');
const platformTemplates = require('../templates/emailTemplates');

const getConfig = async () => {
  try {
    const Settings = require('../models/admin/Settings');
    const [provider, fromEmail, fromName] = await Promise.all([
      Settings.findOne({ key: 'email_provider' }),
      Settings.findOne({ key: 'sender_email' }),
      Settings.findOne({ key: 'sender_name' }),
    ]);
    return {
      provider: provider?.value || env.EMAIL_PROVIDER || 'hdmBridge',
      fromEmail: fromEmail?.value || env.HDM_FROM_EMAIL || 'noreply@bizhub.co.ke',
      fromName: fromName?.value || env.HDM_FROM_NAME || 'BizHub',
    };
  } catch {
    return {
      provider: env.EMAIL_PROVIDER || 'hdmBridge',
      fromEmail: env.HDM_FROM_EMAIL || 'noreply@bizhub.co.ke',
      fromName: env.HDM_FROM_NAME || 'BizHub',
    };
  }
};

const sendViaBrevo = async ({ to, subject, html }) => {
  try {
    const config = await getConfig();
    const payload = { sender: { name: config.fromName, email: config.fromEmail }, to: [{ email: to }], subject, htmlContent: html };
    const response = await brevoClient.post('/smtp/email', payload);
    logger.info('Email sent via Brevo:', { to, subject });
    return { success: true, messageId: response.data?.messageId };
  } catch (error) {
    logger.error('Brevo email error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const sendViaHDM = async ({ to, subject, html }) => {
  try {
    const config = await getConfig();
    const payload = { from: config.fromEmail, fromName: config.fromName, to, subject, htmlBody: html };
    const response = await hdmBridgeClient.post('/emails/send', payload);
    logger.info('Email sent via HDM Bridge:', { to, subject });
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    logger.error('HDM Bridge email error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const send = async (params) => {
  if (!params.to) { logger.warn('Email skipped: no recipient'); return { success: false, error: 'No recipient' }; }
  if (!params.html || typeof params.html !== 'string') { logger.error('Email skipped: invalid html content'); return { success: false, error: 'Invalid content' }; }
  const config = await getConfig();
  if (config.provider === 'brevo') return sendViaBrevo(params);
  return sendViaHDM(params);
};

const sendAccountActivated = async (email, name, businessName, plan, module, startDate, expiryDate) => {
  const html = await platformTemplates.accountActivated({ name, businessName, plan, module, startDate, expiryDate });
  return send({ to: email, subject: 'Account Activated - BizHub', html });
};

const sendEmailVerification = async (email, name, token) => {
  const html = await platformTemplates.emailVerification({ name, token });
  return send({ to: email, subject: 'Verify Your Email - BizHub', html });
};

const sendPasswordReset = async (email, name, token) => {
  const html = await platformTemplates.passwordReset({ name, token });
  return send({ to: email, subject: 'Reset Your Password - BizHub', html });
};

const sendPasswordChanged = async (email, name) => {
  const html = await platformTemplates.passwordChanged({ name });
  return send({ to: email, subject: 'Password Changed - BizHub', html });
};

const sendSubscriptionReceived = async (email, name, businessName, plan, amount, modules) => {
  const html = await platformTemplates.subscriptionReceived({ name, businessName, plan, amount, modules });
  return send({ to: email, subject: 'Subscription Received - BizHub', html });
};

const sendNewSubscriptionAdmin = async (email, data) => {
  const html = await platformTemplates.newSubscriptionAdmin(data);
  return send({ to: email, subject: `New Subscription - ${data.businessName}`, html });
};

const sendPaymentReceipt = async (email, data) => {
  const html = await platformTemplates.paymentReceipt(data);
  return send({ to: email, subject: `Payment Receipt - ${data.businessName}`, html });
};

const sendSubscriptionRenewed = async (email, data) => {
  const html = await platformTemplates.subscriptionRenewed(data);
  return send({ to: email, subject: 'Subscription Renewed - BizHub', html });
};

const sendSubscriptionExpiring = async (email, data) => {
  const html = await platformTemplates.subscriptionExpiring(data);
  return send({ to: email, subject: 'Subscription Expiring Soon - BizHub', html });
};

const sendSubscriptionExpired = async (email, data) => {
  const html = await platformTemplates.subscriptionExpired(data);
  return send({ to: email, subject: 'Subscription Expired - BizHub', html });
};

const sendTrialEnding = async (email, data) => {
  const html = await platformTemplates.trialEnding(data);
  return send({ to: email, subject: 'Trial Ending Soon - BizHub', html });
};

const sendTrialEnded = async (email, data) => {
  const html = await platformTemplates.trialEnded(data);
  return send({ to: email, subject: 'Trial Ended - BizHub', html });
};

const sendAccountSuspended = async (email, data) => {
  const html = await platformTemplates.accountSuspended(data);
  return send({ to: email, subject: 'Account Suspended - BizHub', html });
};

const sendAccountReactivated = async (email, data) => {
  const html = await platformTemplates.accountReactivated(data);
  return send({ to: email, subject: 'Account Reactivated - BizHub', html });
};

const sendSupportTicketCreated = async (email, data) => {
  const html = await platformTemplates.supportTicketCreated(data);
  return send({ to: email, subject: 'Support Ticket Received - BizHub', html });
};

const sendSupportTicketUpdated = async (email, data) => {
  const html = await platformTemplates.supportTicketUpdated(data);
  return send({ to: email, subject: `Ticket #${data.ticketId} Updated - BizHub`, html });
};

const sendSupportTicketResolved = async (email, data) => {
  const html = await platformTemplates.supportTicketResolved(data);
  return send({ to: email, subject: `Ticket #${data.ticketId} Resolved - BizHub`, html });
};

module.exports = {
  send,
  sendAccountActivated, sendEmailVerification, sendPasswordReset, sendPasswordChanged,
  sendSubscriptionReceived, sendNewSubscriptionAdmin, sendPaymentReceipt,
  sendSubscriptionRenewed, sendSubscriptionExpiring, sendSubscriptionExpired,
  sendTrialEnding, sendTrialEnded, sendAccountSuspended, sendAccountReactivated,
  sendSupportTicketCreated, sendSupportTicketUpdated, sendSupportTicketResolved,
};