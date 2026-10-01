const env = require('../config/env');

const APP_NAME = () => env.APP_NAME || 'BizHub';
const CLIENT_URL = () => env.CLIENT_URL || 'http://localhost:3000';
const ADMIN_URL = () => env.ADMIN_URL || 'http://localhost:3001';

const fmt = (n) => Number(n || 0).toLocaleString('en-KE');

/* ============ REGISTRATION ============ */

const tenantRegistrationPending = ({ name, businessName, planName, amount, invoiceNumber }) =>
  `${APP_NAME()}: Hi ${name}, registration for ${businessName} received. Pay KES ${fmt(amount)} for ${planName} plan (Invoice ${invoiceNumber}) to activate. ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantAutoRejected = ({ name, businessName, planName }) =>
  `${APP_NAME()}: Hi ${name}, registration for ${businessName} (${planName}) expired - no payment received. Register again: ${CLIENT_URL()}/pricing`;

const tenantApproved = ({ name, businessName, planName }) =>
  `${APP_NAME()}: Congratulations ${name}! ${businessName} is now active on ${planName} plan. Login: ${CLIENT_URL()}/login`;

const tenantWelcome = ({ name, businessName }) =>
  `${APP_NAME()}: Welcome ${name}! ${businessName} is ready. Explore your dashboard: ${CLIENT_URL()}/login`;

const tenantRejected = ({ name, businessName, reason }) =>
  `${APP_NAME()}: Hi ${name}, registration for ${businessName} was not approved.${reason ? ` Reason: ${reason}` : ''} Contact support for help.`;

const tenantSuspended = ({ businessName, reason }) =>
  `${APP_NAME()}: ${businessName} account has been suspended.${reason ? ` Reason: ${reason}` : ''} Contact support.`;

const tenantReactivated = ({ name, businessName }) =>
  `${APP_NAME()}: Welcome back ${name}! ${businessName} has been reactivated. Login: ${CLIENT_URL()}/login`;

/* ============ PAYMENT ============ */

const tenantPaymentReceived = ({ name, businessName, invoiceNumber, amount }) =>
  `${APP_NAME()}: Payment received! Hi ${name}, KES ${fmt(amount)} for ${businessName} (Invoice ${invoiceNumber}) confirmed. Account under review.`;

const tenantInvoiceReminder = ({ name, invoiceNumber, amount, minutesLeft }) =>
  `${APP_NAME()}: Reminder - Invoice ${invoiceNumber} (KES ${fmt(amount)}) due${minutesLeft ? ` in ${minutesLeft} minutes` : ' soon'}. Pay now to avoid cancellation.`;

const tenantInvoiceExpired = ({ invoiceNumber, businessName }) =>
  `${APP_NAME()}: Invoice ${invoiceNumber} for ${businessName} has expired. Register again at ${CLIENT_URL()}/pricing`;

const tenantPaymentReceipt = ({ businessName, invoiceNumber, amount, reference }) =>
  `${APP_NAME()}: Receipt - ${businessName}, Invoice ${invoiceNumber}, KES ${fmt(amount)} paid. Ref: ${reference || 'N/A'}. Thank you.`;

/* ============ RENEWAL ============ */

const tenantRenewalRequested = ({ name, businessName, planName, amount, invoiceNumber }) =>
  `${APP_NAME()}: Hi ${name}, renewal invoice ${invoiceNumber} created for ${businessName}. Pay KES ${fmt(amount)} for ${planName} plan. ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantRenewalApproved = ({ businessName, planName, newExpiry }) =>
  `${APP_NAME()}: Renewal approved! ${businessName} is active on ${planName} until ${newExpiry}. Thank you.`;

const tenantRenewalRejected = ({ businessName, reason }) =>
  `${APP_NAME()}: Renewal for ${businessName} was not approved.${reason ? ` Reason: ${reason}` : ''} Try again: ${CLIENT_URL()}/renewal`;

const tenantSubscriptionExpired = ({ businessName, planName }) =>
  `${APP_NAME()}: ${businessName} subscription (${planName}) expired. Renew now: ${CLIENT_URL()}/renewal`;

const tenantSubscriptionExpiring = ({ businessName, daysLeft }) =>
  `${APP_NAME()}: ${businessName} subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew: ${CLIENT_URL()}/renewal`;

/* ============ UPGRADE ============ */

const tenantUpgradeRequested = ({ businessName, oldPlan, newPlan, amount, invoiceNumber }) =>
  `${APP_NAME()}: Upgrade invoice ${invoiceNumber} for ${businessName}. ${oldPlan} -> ${newPlan}, KES ${fmt(amount)}. ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantUpgradeApproved = ({ businessName, newPlan }) =>
  `${APP_NAME()}: Upgrade approved! ${businessName} is now on ${newPlan} plan. Login: ${CLIENT_URL()}/login`;

const tenantUpgradeRejected = ({ businessName, reason }) =>
  `${APP_NAME()}: Upgrade for ${businessName} not approved.${reason ? ` Reason: ${reason}` : ''}`;

/* ============ SECURITY ============ */

const newDeviceLogin = ({ name, device, ip }) =>
  `${APP_NAME()}: Hi ${name}, new login detected on ${device || 'unknown device'} (IP ${ip || 'N/A'}). Not you? Reset password immediately.`;

const suspiciousActivity = ({ name, attempts }) =>
  `${APP_NAME()}: Hi ${name}, ${attempts} failed login attempts detected. If this wasn't you, reset your password now.`;

const passwordChangedAlert = ({ name }) =>
  `${APP_NAME()}: Hi ${name}, your password was changed. If this wasn't you, contact support immediately.`;

const emailChangedAlert = ({ name, newEmail }) =>
  `${APP_NAME()}: Hi ${name}, your account email was changed to ${newEmail}. If this wasn't you, contact support.`;

const accountLocked = ({ name, unlockAt }) =>
  `${APP_NAME()}: Hi ${name}, your account is locked due to failed logins.${unlockAt ? ` Unlocks ${unlockAt}.` : ''} Contact support.`;

/* ============ OTP & VERIFICATION ============ */

const otpVerification = ({ code }) =>
  `${code} is your ${APP_NAME()} verification code. Valid 5 minutes. Do not share.`;

const otpLogin = ({ code }) =>
  `${code} is your ${APP_NAME()} login code. Valid 5 minutes.`;

const otpPasswordReset = ({ code }) =>
  `${code} is your ${APP_NAME()} password reset code. Valid 5 minutes.`;

const emailVerify = ({ code }) =>
  `${code} is your ${APP_NAME()} email verification code. Valid 10 minutes.`;

/* ============ ADMIN ============ */

const adminNewRegistration = ({ businessName, ownerName, planName, amount }) =>
  `${APP_NAME()} ADMIN: New registration - ${businessName} by ${ownerName}. Plan: ${planName}, KES ${fmt(amount)}. Review: ${ADMIN_URL()}/approvals`;

const adminPaymentReceived = ({ businessName, ownerName, amount, reference }) =>
  `${APP_NAME()} ADMIN: Payment - ${businessName} (${ownerName}), KES ${fmt(amount)}. Ref: ${reference || 'N/A'}. Review: ${ADMIN_URL()}/approvals`;

const adminRenewalRequest = ({ businessName, planName, amount }) =>
  `${APP_NAME()} ADMIN: Renewal - ${businessName}, ${planName}, KES ${fmt(amount)}. Review: ${ADMIN_URL()}/approvals`;

const adminUpgradeRequest = ({ businessName, oldPlan, newPlan, amount }) =>
  `${APP_NAME()} ADMIN: Upgrade - ${businessName}, ${oldPlan} -> ${newPlan}, KES ${fmt(amount)}. Review: ${ADMIN_URL()}/approvals`;

const adminSystemAlert = ({ level, title, message }) =>
  `${APP_NAME()} ADMIN [${(level || 'INFO').toUpperCase()}]: ${title || 'Alert'}${message ? ` - ${message}` : ''}`;

/* ============ SUPPORT ============ */

const supportTicketCreated = ({ ticketId, subject }) =>
  `${APP_NAME()}: Support ticket #${ticketId} received - "${subject}". We'll respond shortly.`;

const supportTicketResolved = ({ ticketId, subject }) =>
  `${APP_NAME()}: Ticket #${ticketId} resolved - "${subject}". Thank you.`;

/* ============ RESTAURANT MODULE ============ */

const orderConfirmed = ({ orderNo, businessName, total }) =>
  `${APP_NAME()}: Order #${orderNo} at ${businessName} confirmed. Total: KES ${fmt(total)}. We'll notify you when ready.`;

const orderReady = ({ orderNo, businessName }) =>
  `${APP_NAME()}: Order #${orderNo} at ${businessName} is ready for pickup!`;

const restoLowStock = ({ businessName, itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} at ${businessName} has ${stockLeft} left. Reorder soon.`;

/* ============ PHARMA MODULE ============ */

const expiryAlert7Days = ({ businessName, medicineName, expiryDate }) =>
  `${APP_NAME()}: Expiry - ${medicineName} at ${businessName} expires ${expiryDate} (7 days). Clear stock.`;

const expiryAlertToday = ({ businessName, medicineName }) =>
  `${APP_NAME()} URGENT: ${medicineName} at ${businessName} expires TODAY. Remove from stock immediately.`;

const prescriptionReady = ({ prescriptionNo, businessName }) =>
  `${APP_NAME()}: Prescription #${prescriptionNo} is ready for pickup at ${businessName}.`;

const pharmaLowStock = ({ businessName, itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} at ${businessName} has ${stockLeft} left. Reorder soon.`;

/* ============ APARTMENT MODULE ============ */

const rentReminder = ({ unitNumber, amount, dueDate, businessName }) =>
  `${APP_NAME()}: Rent for ${unitNumber} (KES ${fmt(amount)}) at ${businessName} due ${dueDate}. Pay on time.`;

const rentDueToday = ({ unitNumber, amount, businessName }) =>
  `${APP_NAME()}: Rent for ${unitNumber} (KES ${fmt(amount)}) at ${businessName} due TODAY.`;

const rentOverdue = ({ unitNumber, amount, daysOverdue, businessName }) =>
  `${APP_NAME()} OVERDUE: Rent for ${unitNumber} (KES ${fmt(amount)}) at ${businessName} is ${daysOverdue} days late.`;

const rentPaymentReceived = ({ unitNumber, amount, month, receiptNo }) =>
  `${APP_NAME()}: Rent received - ${unitNumber}, KES ${fmt(amount)} for ${month}. Receipt: ${receiptNo}. Thank you.`;

const leaseExpiring = ({ unitNumber, expiryDate, businessName }) =>
  `${APP_NAME()}: Lease for ${unitNumber} at ${businessName} expires ${expiryDate}. Contact us to renew.`;

const maintenanceScheduled = ({ unitNumber, issue, scheduledDate, businessName }) =>
  `${APP_NAME()}: Maintenance for ${unitNumber} (${issue}) at ${businessName} scheduled ${scheduledDate}.`;

const maintenanceCompleted = ({ unitNumber, issue, businessName }) =>
  `${APP_NAME()}: Maintenance completed - ${unitNumber} (${issue}) at ${businessName} resolved.`;

/* ============ ELECTRO MODULE ============ */

const repairReady = ({ device, repairNo, businessName }) =>
  `${APP_NAME()}: Your ${device} (Repair #${repairNo}) is ready for collection at ${businessName}.`;

const warrantyExpiring = ({ product, expiryDate, businessName }) =>
  `${APP_NAME()}: Warranty for ${product} from ${businessName} expires ${expiryDate}.`;

const electroLowStock = ({ businessName, itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} at ${businessName} has ${stockLeft} left.`;

/* ============ CYBER MODULE ============ */

const sessionReceipt = ({ sessionNo, duration, amount, businessName }) =>
  `${APP_NAME()}: Session #${sessionNo} at ${businessName}: ${duration}, KES ${fmt(amount)}. Thank you.`;

const packageExpiring = ({ businessName, packageName, daysLeft }) =>
  `${APP_NAME()}: Your ${packageName} package at ${businessName} expires in ${daysLeft} days.`;

/* ============ MODULE MANAGEMENT ============ */

const moduleAdded = ({ businessName, moduleName }) =>
  `${APP_NAME()}: ${moduleName} module activated for ${businessName}. Login: ${CLIENT_URL()}/login`;

const moduleSwitched = ({ moduleName }) =>
  `${APP_NAME()}: Switched to ${moduleName}.`;

/* ============ BULK ============ */

const broadcast = ({ message }) =>
  `${APP_NAME()}: ${message}`;

const generic = ({ message }) =>
  `${APP_NAME()}: ${message}`;

module.exports = {
  /* Registration */
  tenantRegistrationPending,
  tenantAutoRejected,
  tenantApproved,
  tenantWelcome,
  tenantRejected,
  tenantSuspended,
  tenantReactivated,

  /* Payment */
  tenantPaymentReceived,
  tenantInvoiceReminder,
  tenantInvoiceExpired,
  tenantPaymentReceipt,

  /* Renewal */
  tenantRenewalRequested,
  tenantRenewalApproved,
  tenantRenewalRejected,
  tenantSubscriptionExpired,
  tenantSubscriptionExpiring,

  /* Upgrade */
  tenantUpgradeRequested,
  tenantUpgradeApproved,
  tenantUpgradeRejected,

  /* Security */
  newDeviceLogin,
  suspiciousActivity,
  passwordChangedAlert,
  emailChangedAlert,
  accountLocked,

  /* OTP */
  otpVerification,
  otpLogin,
  otpPasswordReset,
  emailVerify,

  /* Admin */
  adminNewRegistration,
  adminPaymentReceived,
  adminRenewalRequest,
  adminUpgradeRequest,
  adminSystemAlert,

  /* Support */
  supportTicketCreated,
  supportTicketResolved,

  /* Resto */
  orderConfirmed,
  orderReady,
  restoLowStock,

  /* Pharma */
  expiryAlert7Days,
  expiryAlertToday,
  prescriptionReady,
  pharmaLowStock,

  /* Apartment */
  rentReminder,
  rentDueToday,
  rentOverdue,
  rentPaymentReceived,
  leaseExpiring,
  maintenanceScheduled,
  maintenanceCompleted,

  /* Electro */
  repairReady,
  warrantyExpiring,
  electroLowStock,

  /* Cyber */
  sessionReceipt,
  packageExpiring,

  /* Module */
  moduleAdded,
  moduleSwitched,

  /* Generic */
  broadcast,
  generic,

  /* Legacy aliases */
  lowStockAlert: restoLowStock,
  accountActivated: tenantApproved,
  subscriptionRenewed: tenantRenewalApproved,
  subscriptionExpiring: tenantSubscriptionExpiring,
  accountSuspended: tenantSuspended,
  accountReactivated: tenantReactivated,
};