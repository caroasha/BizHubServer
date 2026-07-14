// ============================================
// SMS Templates - Short & Direct Messages
// ============================================

const env = require('../config/env');
const APP_NAME = env.APP_NAME || 'BizHub';

// ============================================
// Platform - User (10)
// ============================================

// 1. OTP - Phone Verification
const otpVerification = ({ code }) => {
  return `${code} is your ${APP_NAME} verification code. Valid for 5 minutes. Do not share with anyone.`;
};

// 2. OTP - Login 2FA
const otpLogin = ({ code }) => {
  return `${code} is your ${APP_NAME} login code. Valid for 5 minutes.`;
};

// 3. OTP - Password Reset
const otpPasswordReset = ({ code }) => {
  return `${code} is your ${APP_NAME} password reset code. Valid for 5 minutes.`;
};

// 4. Registration Confirmation
const registrationConfirmation = ({ name }) => {
  return `Welcome to ${APP_NAME}, ${name}! Your account has been created. Awaiting approval. We'll notify you once activated.`;
};

// 5. Account Activated
const accountActivated = ({ name, businessName }) => {
  return `Great news ${name}! Your ${businessName} account on ${APP_NAME} has been activated. Login at ${env.CLIENT_URL}/login`;
};

// 6. Payment Confirmation
const paymentConfirmation = ({ amount, ref, businessName }) => {
  return `Payment of KSh ${amount} received for ${businessName}. Ref: ${ref}. Thank you for choosing ${APP_NAME}.`;
};

// 7. Subscription Renewed
const subscriptionRenewed = ({ businessName, plan }) => {
  return `${businessName}: Your ${plan} plan on ${APP_NAME} has been renewed successfully.`;
};

// 8. Subscription Expiring (3 days)
const subscriptionExpiring = ({ businessName, daysLeft }) => {
  return `${businessName}: Your ${APP_NAME} subscription expires in ${daysLeft} days. Renew now to avoid interruption: ${env.CLIENT_URL}/billing`;
};

// 9. Trial Ending (2 days)
const trialEnding = ({ businessName, daysLeft }) => {
  return `${businessName}: Your free trial ends in ${daysLeft} days. Subscribe to continue: ${env.CLIENT_URL}/pricing`;
};

// 10. Account Suspended
const accountSuspended = ({ businessName }) => {
  return `${businessName}: Your ${APP_NAME} account has been suspended. Contact support@bizhub.co.ke for assistance.`;
};

// 11. Account Reactivated
const accountReactivated = ({ businessName }) => {
  return `Good news! Your ${businessName} account on ${APP_NAME} has been reactivated. Welcome back!`;
};

// ============================================
// Platform - Admin (2)
// ============================================

// 12. New Registration Alert
const newRegistrationAdmin = ({ businessName, plan, ownerName }) => {
  return `New ${APP_NAME} registration: ${businessName} (${plan}) by ${ownerName}. Login to admin panel to approve.`;
};

// ============================================
// Module-Level (16)
// ============================================

// 13. Order Confirmed
const orderConfirmed = ({ orderNo, businessName, total }) => {
  return `Order #${orderNo} confirmed at ${businessName}. Total: KSh ${total}. We'll notify you when ready.`;
};

// 14. Order Ready for Pickup
const orderReady = ({ orderNo, businessName }) => {
  return `Your order #${orderNo} at ${businessName} is ready for pickup! Thank you for your patience.`;
};

// 15. Low Stock Alert
const lowStockAlert = ({ businessName, itemName, stockLeft }) => {
  return `Low stock alert: ${itemName} at ${businessName} has only ${stockLeft} remaining. Time to reorder.`;
};

// 16. Expiry Alert (7 days)
const expiryAlert7Days = ({ businessName, medicineName, expiryDate }) => {
  return `Expiry alert: ${medicineName} at ${businessName} expires on ${expiryDate} (7 days). Please clear stock.`;
};

// 17. Expiry Alert (today)
const expiryAlertToday = ({ businessName, medicineName }) => {
  return `URGENT: ${medicineName} at ${businessName} expires TODAY. Remove from stock immediately.`;
};

// 18. Prescription Ready
const prescriptionReady = ({ prescriptionNo, businessName }) => {
  return `Your prescription #${prescriptionNo} is ready for pickup at ${businessName}.`;
};

// 19. Rent Reminder (3 days before)
const rentReminder = ({ unitNumber, amount, dueDate, businessName }) => {
  return `Reminder: Rent for ${unitNumber} (KSh ${amount}) at ${businessName} is due on ${dueDate}. Please pay on time.`;
};

// 20. Rent Reminder (due today)
const rentDueToday = ({ unitNumber, amount, businessName }) => {
  return `Rent for ${unitNumber} (KSh ${amount}) at ${businessName} is due TODAY. Kindly make payment to avoid penalties.`;
};

// 21. Rent Overdue (3 days)
const rentOverdue = ({ unitNumber, amount, daysOverdue, businessName }) => {
  return `OVERDUE: Rent for ${unitNumber} (KSh ${amount}) at ${businessName} is ${daysOverdue} days late. Please pay immediately.`;
};

// 22. Rent Payment Received
const rentPaymentReceived = ({ unitNumber, amount, month, receiptNo }) => {
  return `Rent payment received: ${unitNumber}, KSh ${amount} for ${month}. Receipt: ${receiptNo}. Thank you!`;
};

// 23. Lease Expiring (14 days)
const leaseExpiring = ({ unitNumber, expiryDate, businessName }) => {
  return `Your lease for ${unitNumber} at ${businessName} expires on ${expiryDate}. Contact us to discuss renewal.`;
};

// 24. Maintenance Scheduled
const maintenanceScheduled = ({ unitNumber, issue, scheduledDate, businessName }) => {
  return `Maintenance for ${unitNumber} (${issue}) at ${businessName} scheduled for ${scheduledDate}. We'll keep you updated.`;
};

// 25. Maintenance Completed
const maintenanceCompleted = ({ unitNumber, issue, businessName }) => {
  return `Maintenance completed: ${unitNumber} (${issue}) at ${businessName} has been resolved. Thank you for your patience.`;
};

// 26. Repair Ready for Collection
const repairReady = ({ device, repairNo, businessName }) => {
  return `Your ${device} (Repair #${repairNo}) is ready for collection at ${businessName}.`;
};

// 27. Warranty Expiring (14 days)
const warrantyExpiring = ({ product, expiryDate, businessName }) => {
  return `Your ${product} warranty from ${businessName} expires on ${expiryDate}. Visit us for any warranty claims.`;
};

// 28. Session Ended / Receipt
const sessionReceipt = ({ sessionNo, duration, amount, businessName }) => {
  return `Session #${sessionNo} at ${businessName}: ${duration}, Total KSh ${amount}. Thank you for visiting!`;
};

// ============================================
// Export All Templates
// ============================================

module.exports = {
  // Platform - User
  otpVerification,           // 1
  otpLogin,                  // 2
  otpPasswordReset,          // 3
  registrationConfirmation,  // 4
  accountActivated,          // 5
  paymentConfirmation,       // 6
  subscriptionRenewed,       // 7
  subscriptionExpiring,      // 8
  trialEnding,               // 9
  accountSuspended,          // 10
  accountReactivated,        // 11

  // Platform - Admin
  newRegistrationAdmin,      // 12

  // Module-Level
  orderConfirmed,            // 13
  orderReady,                // 14
  lowStockAlert,             // 15
  expiryAlert7Days,          // 16
  expiryAlertToday,          // 17
  prescriptionReady,         // 18
  rentReminder,              // 19
  rentDueToday,              // 20
  rentOverdue,               // 21
  rentPaymentReceived,       // 22
  leaseExpiring,             // 23
  maintenanceScheduled,      // 24
  maintenanceCompleted,      // 25
  repairReady,               // 26
  warrantyExpiring,          // 27
  sessionReceipt,            // 28
};