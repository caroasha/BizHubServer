const env = require('../config/env');
const logger = require('../utils/logger');
const brevoClient = require('../config/brevo');
const hdmBridgeClient = require('../config/hdmBridge');
const templates = require('../templates/smsTemplates');

const provider = env.SMS_PROVIDER || 'hdmBridge';

const getSmsEnabled = async () => {
  try {
    const Settings = require('../models/admin/Settings');
    const setting = await Settings.findOne({ key: 'sms_enabled', category: 'features' });
    return setting ? setting.value !== 'false' : true;
  } catch {
    return true;
  }
};

const sendViaBrevo = async ({ to, message }) => {
  try {
    const payload = { sender: env.APP_NAME || 'BizHub', recipient: to, content: message };
    const response = await brevoClient.post('/transactionalSMS/sms', payload);
    logger.info('SMS sent via Brevo:', { to });
    return { success: true, messageId: response.data?.messageId };
  } catch (error) {
    logger.error('Brevo SMS error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const sendViaHDM = async ({ to, message }) => {
  try {
    const payload = { from: env.APP_NAME || 'BizHub', to, message };
    const response = await hdmBridgeClient.post('/sms/send', payload);
    logger.info('SMS sent via HDM Bridge:', { to });
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    logger.error('HDM Bridge SMS error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const send = async (params) => {
  if (!params.to) {
    logger.warn('SMS skipped: no recipient');
    return { success: false, error: 'No recipient' };
  }

  const enabled = await getSmsEnabled();
  if (!enabled) {
    logger.info('SMS skipped: globally disabled');
    return { success: false, error: 'SMS disabled' };
  }

  if (provider === 'brevo') return sendViaBrevo(params);
  return sendViaHDM(params);
};

const sendOtpVerification = (phone, code) => send({ to: phone, message: templates.otpVerification({ code }) });
const sendOtpLogin = (phone, code) => send({ to: phone, message: templates.otpLogin({ code }) });
const sendOtpPasswordReset = (phone, code) => send({ to: phone, message: templates.otpPasswordReset({ code }) });
const sendRegistrationConfirmation = (phone, name) => send({ to: phone, message: templates.registrationConfirmation({ name }) });
const sendAccountActivated = (phone, name, businessName) => send({ to: phone, message: templates.accountActivated({ name, businessName }) });
const sendPaymentConfirmation = (phone, amount, ref, businessName) => send({ to: phone, message: templates.paymentConfirmation({ amount, ref, businessName }) });
const sendSubscriptionRenewed = (phone, businessName, plan) => send({ to: phone, message: templates.subscriptionRenewed({ businessName, plan }) });
const sendSubscriptionExpiring = (phone, businessName, daysLeft) => send({ to: phone, message: templates.subscriptionExpiring({ businessName, daysLeft }) });
const sendTrialEnding = (phone, businessName, daysLeft) => send({ to: phone, message: templates.trialEnding({ businessName, daysLeft }) });
const sendAccountSuspended = (phone, businessName) => send({ to: phone, message: templates.accountSuspended({ businessName }) });
const sendAccountReactivated = (phone, businessName) => send({ to: phone, message: templates.accountReactivated({ businessName }) });
const sendNewRegistrationAdmin = (phone, businessName, plan, ownerName) => send({ to: phone, message: templates.newRegistrationAdmin({ businessName, plan, ownerName }) });
const sendOrderConfirmed = (phone, orderNo, businessName, total) => send({ to: phone, message: templates.orderConfirmed({ orderNo, businessName, total }) });
const sendOrderReady = (phone, orderNo, businessName) => send({ to: phone, message: templates.orderReady({ orderNo, businessName }) });
const sendLowStockAlert = (phone, businessName, itemName, stockLeft) => send({ to: phone, message: templates.lowStockAlert({ businessName, itemName, stockLeft }) });
const sendExpiryAlert7Days = (phone, businessName, medicineName, expiryDate) => send({ to: phone, message: templates.expiryAlert7Days({ businessName, medicineName, expiryDate }) });
const sendExpiryAlertToday = (phone, businessName, medicineName) => send({ to: phone, message: templates.expiryAlertToday({ businessName, medicineName }) });
const sendPrescriptionReady = (phone, prescriptionNo, businessName) => send({ to: phone, message: templates.prescriptionReady({ prescriptionNo, businessName }) });
const sendRentReminder = (phone, unitNumber, amount, dueDate, businessName) => send({ to: phone, message: templates.rentReminder({ unitNumber, amount, dueDate, businessName }) });
const sendRentDueToday = (phone, unitNumber, amount, businessName) => send({ to: phone, message: templates.rentDueToday({ unitNumber, amount, businessName }) });
const sendRentOverdue = (phone, unitNumber, amount, daysOverdue, businessName) => send({ to: phone, message: templates.rentOverdue({ unitNumber, amount, daysOverdue, businessName }) });
const sendRentPaymentReceived = (phone, unitNumber, amount, month, receiptNo) => send({ to: phone, message: templates.rentPaymentReceived({ unitNumber, amount, month, receiptNo }) });
const sendLeaseExpiring = (phone, unitNumber, expiryDate, businessName) => send({ to: phone, message: templates.leaseExpiring({ unitNumber, expiryDate, businessName }) });
const sendMaintenanceScheduled = (phone, unitNumber, issue, scheduledDate, businessName) => send({ to: phone, message: templates.maintenanceScheduled({ unitNumber, issue, scheduledDate, businessName }) });
const sendMaintenanceCompleted = (phone, unitNumber, issue, businessName) => send({ to: phone, message: templates.maintenanceCompleted({ unitNumber, issue, businessName }) });
const sendRepairReady = (phone, device, repairNo, businessName) => send({ to: phone, message: templates.repairReady({ device, repairNo, businessName }) });
const sendWarrantyExpiring = (phone, product, expiryDate, businessName) => send({ to: phone, message: templates.warrantyExpiring({ product, expiryDate, businessName }) });
const sendSessionReceipt = (phone, sessionNo, duration, amount, businessName) => send({ to: phone, message: templates.sessionReceipt({ sessionNo, duration, amount, businessName }) });

const sendBulk = async (recipients, message) => {
  const results = await Promise.allSettled(recipients.map((to) => send({ to, message })));
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  return { success: sent === recipients.length, sent, failed: recipients.length - sent, total: recipients.length };
};

module.exports = {
  send, sendOtpVerification, sendOtpLogin, sendOtpPasswordReset,
  sendRegistrationConfirmation, sendAccountActivated, sendPaymentConfirmation,
  sendSubscriptionRenewed, sendSubscriptionExpiring, sendTrialEnding,
  sendAccountSuspended, sendAccountReactivated, sendNewRegistrationAdmin,
  sendOrderConfirmed, sendOrderReady, sendLowStockAlert,
  sendExpiryAlert7Days, sendExpiryAlertToday, sendPrescriptionReady,
  sendRentReminder, sendRentDueToday, sendRentOverdue, sendRentPaymentReceived,
  sendLeaseExpiring, sendMaintenanceScheduled, sendMaintenanceCompleted,
  sendRepairReady, sendWarrantyExpiring, sendSessionReceipt, sendBulk,
};