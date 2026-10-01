const env = require('../config/env');

const APP_NAME = () => env.APP_NAME || 'BizHub';
const CLIENT_URL = () => env.CLIENT_URL || 'http://localhost:3000';
const ADMIN_URL = () => env.ADMIN_URL || 'http://localhost:3001';

const fmt = (n) => Number(n || 0).toLocaleString('en-KE');

/* ============ REGISTRATION ============ */

const tenantRegistrationPending = ({ name, businessName, amount, invoiceNumber }) =>
  `${APP_NAME()}: ${businessName} reg received. Pay KES ${fmt(amount)} (Inv ${invoiceNumber}) to activate: ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantAutoRejected = ({ businessName }) =>
  `${APP_NAME()}: Registration for ${businessName} expired (no payment). Register again: ${CLIENT_URL()}/pricing`;

const tenantApproved = ({ name, businessName, planName }) =>
  `${APP_NAME()}: Congrats ${name}! ${businessName} is active on ${planName}. Login: ${CLIENT_URL()}/login`;

const tenantWelcome = ({ name }) =>
  `${APP_NAME()}: Welcome ${name}! Your account is ready. Login: ${CLIENT_URL()}/login`;

const tenantRejected = ({ businessName, reason }) =>
  `${APP_NAME()}: ${businessName} registration not approved.${reason ? ` ${reason}` : ''} Contact support.`;

const tenantSuspended = ({ businessName, reason }) =>
  `${APP_NAME()}: ${businessName} suspended.${reason ? ` ${reason}` : ''} Contact support.`;

const tenantReactivated = ({ name, businessName }) =>
  `${APP_NAME()}: Welcome back ${name}! ${businessName} is active. Login: ${CLIENT_URL()}/login`;

/* ============ PAYMENT ============ */

const tenantPaymentReceived = ({ businessName, invoiceNumber, amount }) =>
  `${APP_NAME()}: KES ${fmt(amount)} received for ${businessName} (Inv ${invoiceNumber}). Account under review.`;

const tenantInvoiceReminder = ({ invoiceNumber, amount, minutesLeft }) =>
  `${APP_NAME()}: Invoice ${invoiceNumber} (KES ${fmt(amount)}) due${minutesLeft ? ` in ${minutesLeft}min` : ' soon'}. Pay now to avoid cancellation.`;

const tenantInvoiceExpired = ({ invoiceNumber, businessName }) =>
  `${APP_NAME()}: Invoice ${invoiceNumber} for ${businessName} expired. Register again: ${CLIENT_URL()}/pricing`;

const tenantPaymentReceipt = ({ invoiceNumber, amount, reference }) =>
  `${APP_NAME()}: Receipt - Inv ${invoiceNumber}, KES ${fmt(amount)} paid. Ref: ${reference || 'N/A'}. Thank you.`;

/* ============ RENEWAL ============ */

const tenantRenewalRequested = ({ businessName, amount, invoiceNumber }) =>
  `${APP_NAME()}: Renewal invoice ${invoiceNumber} for ${businessName}. Pay KES ${fmt(amount)}: ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantRenewalApproved = ({ businessName, planName, newExpiry }) =>
  `${APP_NAME()}: ${businessName} renewed on ${planName} until ${newExpiry}. Thank you.`;

const tenantRenewalRejected = ({ businessName, reason }) =>
  `${APP_NAME()}: Renewal for ${businessName} not approved.${reason ? ` ${reason}` : ''} Try again: ${CLIENT_URL()}/renewal`;

const tenantSubscriptionExpired = ({ businessName, planName }) =>
  `${APP_NAME()}: ${businessName} (${planName}) expired. Renew: ${CLIENT_URL()}/renewal`;

const tenantSubscriptionExpiring = ({ businessName, daysLeft }) =>
  `${APP_NAME()}: ${businessName} expires in ${daysLeft}d. Renew: ${CLIENT_URL()}/renewal`;

/* ============ UPGRADE ============ */

const tenantUpgradeRequested = ({ businessName, oldPlan, newPlan, amount, invoiceNumber }) =>
  `${APP_NAME()}: Upgrade invoice ${invoiceNumber} for ${businessName}. ${oldPlan}->${newPlan}, KES ${fmt(amount)}: ${CLIENT_URL()}/invoice/${invoiceNumber}`;

const tenantUpgradeApproved = ({ businessName, newPlan }) =>
  `${APP_NAME()}: ${businessName} upgraded to ${newPlan}. Login: ${CLIENT_URL()}/login`;

const tenantUpgradeRejected = ({ businessName }) =>
  `${APP_NAME()}: Upgrade for ${businessName} not approved. Contact support.`;

/* ============ SECURITY ============ */

const newDeviceLogin = ({ name, device, ip }) =>
  `${APP_NAME()}: ${name}, new login on ${device || 'unknown device'} (IP ${ip || 'N/A'}). Not you? Reset password now.`;

const suspiciousActivity = ({ name, attempts }) =>
  `${APP_NAME()}: ${name}, ${attempts} failed logins detected. Reset your password if this wasn't you.`;

const passwordChangedAlert = ({ name }) =>
  `${APP_NAME()}: ${name}, your password was changed. If this wasn't you, contact support now.`;

const emailChangedAlert = ({ name, newEmail }) =>
  `${APP_NAME()}: ${name}, email changed to ${newEmail}. If this wasn't you, contact support.`;

const accountLocked = ({ name }) =>
  `${APP_NAME()}: ${name}, account locked due to failed logins. Contact support.`;

/* ============ OTP ============ */

const otpVerification = ({ code }) =>
  `${code} is your ${APP_NAME()} verification code. Valid 5 min. Do not share.`;

const otpLogin = ({ code }) =>
  `${code} is your ${APP_NAME()} login code. Valid 5 min.`;

const otpPasswordReset = ({ code }) =>
  `${code} is your ${APP_NAME()} password reset code. Valid 5 min.`;

const emailVerify = ({ code }) =>
  `${code} is your ${APP_NAME()} email verification code. Valid 10 min.`;

/* ============ ADMIN ============ */

const adminNewRegistration = ({ businessName, ownerName, planName, amount }) =>
  `${APP_NAME()} ADMIN: New reg - ${businessName} by ${ownerName}. ${planName}, KES ${fmt(amount)}. ${ADMIN_URL()}/approvals`;

const adminPaymentReceived = ({ businessName, amount, reference }) =>
  `${APP_NAME()} ADMIN: Payment - ${businessName}, KES ${fmt(amount)}. Ref: ${reference || 'N/A'}. ${ADMIN_URL()}/approvals`;

const adminRenewalRequest = ({ businessName, planName, amount }) =>
  `${APP_NAME()} ADMIN: Renewal - ${businessName}, ${planName}, KES ${fmt(amount)}. ${ADMIN_URL()}/approvals`;

const adminUpgradeRequest = ({ businessName, oldPlan, newPlan, amount }) =>
  `${APP_NAME()} ADMIN: Upgrade - ${businessName} ${oldPlan}->${newPlan}, KES ${fmt(amount)}. ${ADMIN_URL()}/approvals`;

const adminSystemAlert = ({ level, title, message }) =>
  `${APP_NAME()} ADMIN [${(level || 'INFO').toUpperCase()}]: ${title || 'Alert'}${message ? ` - ${message}` : ''}`;

/* ============ SUPPORT ============ */

const supportTicketCreated = ({ ticketId, subject }) =>
  `${APP_NAME()}: Ticket #${ticketId} received - "${subject}". We'll respond shortly.`;

const supportTicketResolved = ({ ticketId }) =>
  `${APP_NAME()}: Ticket #${ticketId} resolved. Thank you.`;

/* ============ RESTO ============ */

const orderConfirmed = ({ orderNo, businessName, total }) =>
  `${APP_NAME()}: Order #${orderNo} at ${businessName} confirmed. KES ${fmt(total)}.`;

const orderReady = ({ orderNo, businessName }) =>
  `${APP_NAME()}: Order #${orderNo} at ${businessName} is ready!`;

const restoLowStock = ({ businessName, itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} at ${businessName} (${stockLeft} left). Reorder soon.`;

/* ============ PHARMA ============ */

const expiryAlert7Days = ({ medicineName, expiryDate }) =>
  `${APP_NAME()}: ${medicineName} expires ${expiryDate} (7 days). Clear stock.`;

const expiryAlertToday = ({ medicineName }) =>
  `${APP_NAME()} URGENT: ${medicineName} expires TODAY. Remove from stock.`;

const prescriptionReady = ({ prescriptionNo, businessName }) =>
  `${APP_NAME()}: Prescription #${prescriptionNo} ready at ${businessName}.`;

const pharmaLowStock = ({ businessName, itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} at ${businessName} (${stockLeft} left).`;

/* ============ APARTMENT ============ */

const rentReminder = ({ unitNumber, amount, dueDate }) =>
  `${APP_NAME()}: Rent for ${unitNumber} (KES ${fmt(amount)}) due ${dueDate}.`;

const rentDueToday = ({ unitNumber, amount }) =>
  `${APP_NAME()}: Rent for ${unitNumber} (KES ${fmt(amount)}) due TODAY.`;

const rentOverdue = ({ unitNumber, amount, daysOverdue }) =>
  `${APP_NAME()}: OVERDUE rent for ${unitNumber} (KES ${fmt(amount)}), ${daysOverdue}d late.`;

const rentPaymentReceived = ({ unitNumber, amount, month, receiptNo }) =>
  `${APP_NAME()}: Rent received - ${unitNumber}, KES ${fmt(amount)} for ${month}. Receipt ${receiptNo}.`;

const leaseExpiring = ({ unitNumber, expiryDate }) =>
  `${APP_NAME()}: Lease for ${unitNumber} expires ${expiryDate}. Contact us to renew.`;

const maintenanceScheduled = ({ unitNumber, issue, scheduledDate }) =>
  `${APP_NAME()}: Maintenance for ${unitNumber} (${issue}) scheduled ${scheduledDate}.`;

const maintenanceCompleted = ({ unitNumber, issue }) =>
  `${APP_NAME()}: Maintenance for ${unitNumber} (${issue}) completed.`;

/* ============ ELECTRO ============ */

const repairReady = ({ device, repairNo, businessName }) =>
  `${APP_NAME()}: ${device} (Repair #${repairNo}) ready at ${businessName}.`;

const warrantyExpiring = ({ product, expiryDate }) =>
  `${APP_NAME()}: Warranty for ${product} expires ${expiryDate}.`;

const electroLowStock = ({ itemName, stockLeft }) =>
  `${APP_NAME()}: Low stock - ${itemName} (${stockLeft} left).`;

/* ============ CYBER ============ */

const sessionReceipt = ({ sessionNo, duration, amount }) =>
  `${APP_NAME()}: Session #${sessionNo}: ${duration}, KES ${fmt(amount)}. Thank you.`;

const packageExpiring = ({ packageName, daysLeft }) =>
  `${APP_NAME()}: Your ${packageName} package expires in ${daysLeft}d.`;

/* ============ MODULE ============ */

const moduleAdded = ({ moduleName }) =>
  `${APP_NAME()}: ${moduleName} module activated. Login: ${CLIENT_URL()}/login`;

const moduleSwitched = ({ moduleName }) =>
  `${APP_NAME()}: Switched to ${moduleName}.`;

/* ============ GENERIC ============ */

const broadcast = ({ message }) => `${APP_NAME()}: ${message}`;
const generic = ({ message }) => `${APP_NAME()}: ${message}`;

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