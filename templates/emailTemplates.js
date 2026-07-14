const env = require('../config/env');

const getSettings = async () => {
  try {
    const Settings = require('../models/admin/Settings');
    const settings = await Settings.find({
      key: { $in: ['system_name', 'support_email', 'support_phone', 'sender_name', 'sender_email'] }
    }).lean();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  } catch { return {}; }
};

const getBaseData = async () => {
  const s = await getSettings();
  return {
    APP_NAME: s.system_name || env.APP_NAME || 'BizHub',
    SUPPORT_EMAIL: s.support_email || 'support@bizhub.co.ke',
    SUPPORT_PHONE: s.support_phone || '',
    APP_URL: env.CLIENT_URL || 'http://localhost:3000',
    CURRENT_YEAR: new Date().getFullYear(),
  };
};

const baseLayout = async (content, title) => {
  const d = await getBaseData();
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} - ${d.APP_NAME}</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:30px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">${d.APP_NAME}</h1>
<p style="color:#bbdefb;margin:8px 0 0;font-size:14px;">Universal Business Management Suite</p>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:16px 40px;border-bottom:1px solid #e2e8f0;">
<h2 style="margin:0;font-size:18px;color:#1e293b;font-weight:600;">${title}</h2>
</td></tr>
<tr><td style="padding:30px 40px;">${content}</td></tr>
<tr><td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0 0 6px;font-size:13px;color:#64748b;">© ${d.CURRENT_YEAR} ${d.APP_NAME}. All rights reserved.</p>
${d.SUPPORT_EMAIL ? `<p style="margin:0;font-size:12px;color:#94a3b8;">${d.SUPPORT_EMAIL} ${d.SUPPORT_PHONE ? '| ' + d.SUPPORT_PHONE : ''}</p>` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

const styles = {
  button: (color = '#1a73e8') => `display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;text-align:center;`,
  infoBox: `background-color:#f0f7ff;border-left:4px solid #1a73e8;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  warningBox: `background-color:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  dangerBox: `background-color:#fff1f2;border-left:4px solid #e11d48;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  successBox: `background-color:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  detailTable: `width:100%;border-collapse:collapse;margin:16px 0;`,
  detailRow: `border-bottom:1px solid #e2e8f0;`,
  detailLabel: `padding:8px 0;font-size:13px;color:#64748b;font-weight:500;`,
  detailValue: `padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;`,
};

const accountActivated = async ({ name, businessName, plan, module, startDate, expiryDate, loginUrl }) => {
  const d = await getBaseData();
  const content = `
    <div style="text-align:center;margin:16px 0;"><div style="width:64px;height:64px;background-color:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;"><span style="font-size:32px;">🚀</span></div></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Congratulations ${name || 'there'}!</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your <strong>${businessName || 'Business'}</strong> account has been <span style="color:#16a34a;font-weight:600;">activated</span>.</p>
    <div style="${styles.successBox}">
      <p style="margin:0 0 12px;font-size:14px;color:#166534;font-weight:600;">🎉 Account Details</p>
      <table style="${styles.detailTable}">
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Business</td><td style="${styles.detailValue}">${businessName || 'N/A'}</td></tr>
        ${module ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Module</td><td style="${styles.detailValue}">${module}</td></tr>` : ''}
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Plan</td><td style="${styles.detailValue}">${plan || 'Free Trial'}</td></tr>
        ${startDate ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Start Date</td><td style="${styles.detailValue}">${startDate}</td></tr>` : ''}
        ${expiryDate ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Expiry</td><td style="${styles.detailValue}">${expiryDate}</td></tr>` : ''}
        <tr><td style="${styles.detailLabel}">Status</td><td style="${styles.detailValue};color:#16a34a;">✅ Active</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;"><a href="${loginUrl || d.APP_URL + '/login'}" style="${styles.button('#16a34a')}">Go to Dashboard</a></div>
  `;
  return baseLayout(content, 'Account Activated!');
};

const emailVerification = async ({ name, token }) => {
  const d = await getBaseData();
  const link = `${d.APP_URL}/verify-email?token=${token}`;
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Please verify your email address to get started.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${link}" style="${styles.button()}">Verify Email Address</a></div>
    <div style="${styles.infoBox}"><p style="margin:0;font-size:13px;color:#475569;"><strong>Link expires in 1 hour.</strong></p></div>
  `;
  return baseLayout(content, 'Verify Your Email');
};

const passwordReset = async ({ name, token }) => {
  const d = await getBaseData();
  const link = `${d.APP_URL}/reset-password?token=${token}`;
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">We received a request to reset your password.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${link}" style="${styles.button('#f59e0b')}">Reset Password</a></div>
    <div style="${styles.warningBox}"><p style="margin:0;font-size:13px;color:#92400e;"><strong>⚠️ This link expires in 1 hour.</strong></p></div>
  `;
  return baseLayout(content, 'Reset Your Password');
};

const passwordChanged = async ({ name }) => {
  const content = `
    <div style="${styles.successBox}"><p style="margin:0;font-size:14px;color:#166534;"><strong>✅ Password changed successfully.</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Hello ${name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your password was just changed.</p>
  `;
  return baseLayout(content, 'Password Changed');
};

const subscriptionReceived = async ({ name, businessName, plan, amount, modules }) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your subscription request has been received and is pending approval.</p>
    <div style="${styles.infoBox}">
      <p style="margin:0 0 12px;font-size:14px;color:#1e40af;font-weight:600;">📋 Subscription Details</p>
      <table style="${styles.detailTable}">
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Business</td><td style="${styles.detailValue}">${businessName || 'N/A'}</td></tr>
        ${modules ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Module</td><td style="${styles.detailValue}">${modules}</td></tr>` : ''}
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Plan</td><td style="${styles.detailValue}">${plan || 'N/A'}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue};font-weight:700;">KSh ${(amount || 0).toLocaleString()}</td></tr>
        <tr><td style="${styles.detailLabel}">Status</td><td style="${styles.detailValue};color:#f59e0b;">⏳ Pending Approval</td></tr>
      </table>
    </div>
    <p style="font-size:14px;color:#64748b;">We'll notify you once your account is activated.</p>
  `;
  return baseLayout(content, 'Subscription Received');
};

const newSubscriptionAdmin = async (data) => {
  const cycleLabels = { monthly: '/mo', yearly: '/yr', permanent: ' (Permanent)', trial: '' };
  const cycleLabel = cycleLabels[data.planCycle] || '';
  const content = `
    <div style="${styles.infoBox}"><p style="margin:0;font-size:14px;color:#1e40af;"><strong>📢 New subscription requires approval</strong></p></div>
    <table style="${styles.detailTable}">
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Business</td><td style="${styles.detailValue}">${data.businessName || 'N/A'}</td></tr>
      ${data.modules ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Module</td><td style="${styles.detailValue}">${data.modules}</td></tr>` : ''}
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Plan</td><td style="${styles.detailValue}">${data.plan || 'N/A'}${cycleLabel}</td></tr>
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue};font-weight:700;color:#1a73e8;">KSh ${(data.amount || 0).toLocaleString()}</td></tr>
      ${data.planCycle ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Cycle</td><td style="${styles.detailValue}">${data.planCycle}</td></tr>` : ''}
      ${data.paymentMethod ? `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Payment</td><td style="${styles.detailValue}">${data.paymentMethod}</td></tr>` : ''}
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Owner</td><td style="${styles.detailValue}">${data.ownerName || 'N/A'}</td></tr>
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Email</td><td style="${styles.detailValue}">${data.ownerEmail || 'N/A'}</td></tr>
      <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Phone</td><td style="${styles.detailValue}">${data.ownerPhone || 'N/A'}</td></tr>
      ${data.date ? `<tr><td style="${styles.detailLabel}">Date</td><td style="${styles.detailValue}">${data.date}</td></tr>` : ''}
    </table>
  `;
  return baseLayout(content, 'New Subscription - Action Required');
};

const paymentReceipt = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your payment has been received.</p>
    <div style="${styles.successBox}">
      <table style="${styles.detailTable}">
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Receipt</td><td style="${styles.detailValue}">${data.receiptNo || 'N/A'}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue};font-size:16px;color:#16a34a;">KSh ${(data.amount || 0).toLocaleString()}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Method</td><td style="${styles.detailValue}">${data.method || 'N/A'}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Date</td><td style="${styles.detailValue}">${data.date || 'N/A'}</td></tr>
        <tr><td style="${styles.detailLabel}">Business</td><td style="${styles.detailValue}">${data.businessName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return baseLayout(content, 'Payment Receipt');
};

const subscriptionRenewed = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your subscription has been <span style="color:#16a34a;font-weight:600;">successfully renewed</span>.</p>
    <div style="${styles.successBox}">
      <table style="${styles.detailTable}">
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Business</td><td style="${styles.detailValue}">${data.businessName || 'N/A'}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Plan</td><td style="${styles.detailValue}">${data.plan || 'N/A'}</td></tr>
        <tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue}">KSh ${(data.amount || 0).toLocaleString()}</td></tr>
        <tr><td style="${styles.detailLabel}">Next Billing</td><td style="${styles.detailValue}">${data.nextBillingDate || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return baseLayout(content, 'Subscription Renewed');
};

const subscriptionExpiring = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your subscription will expire in <strong style="color:#f59e0b;">${data.daysLeft || '?'} days</strong>.</p>
    <div style="${styles.warningBox}"><table style="${styles.detailTable}"><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Plan</td><td style="${styles.detailValue}">${data.plan || 'N/A'}</td></tr><tr><td style="${styles.detailLabel}">Expires</td><td style="${styles.detailValue};color:#f59e0b;">${data.expiryDate || 'N/A'}</td></tr></table></div>
    <div style="text-align:center;margin:24px 0;"><a href="${data.renewalUrl || '#'}" style="${styles.button('#f59e0b')}">Renew Now</a></div>
  `;
  return baseLayout(content, 'Subscription Expiring Soon');
};

const subscriptionExpired = async (data) => {
  const content = `
    <div style="${styles.dangerBox}"><p style="margin:0;font-size:14px;color:#9f1239;"><strong>⚠️ Your subscription has expired</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your subscription for <strong>${data.businessName || 'Business'}</strong> expired on <strong>${data.expiryDate || 'N/A'}</strong>.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${data.renewalUrl || '#'}" style="${styles.button('#e11d48')}">Reactivate Now</a></div>
  `;
  return baseLayout(content, 'Subscription Expired');
};

const trialEnding = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your free trial for <strong>${data.businessName || 'Business'}</strong> ends in <strong style="color:#f59e0b;">${data.daysLeft || '?'} days</strong>.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${data.upgradeUrl || '#'}" style="${styles.button()}">Choose a Plan</a></div>
  `;
  return baseLayout(content, 'Free Trial Ending Soon');
};

const trialEnded = async (data) => {
  const content = `
    <div style="${styles.dangerBox}"><p style="margin:0;font-size:14px;color:#9f1239;"><strong>Your free trial has ended</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Subscribe to a plan to continue.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${data.upgradeUrl || '#'}" style="${styles.button('#e11d48')}">Subscribe Now</a></div>
  `;
  return baseLayout(content, 'Trial Ended');
};

const accountSuspended = async (data) => {
  const content = `
    <div style="${styles.dangerBox}"><p style="margin:0;font-size:14px;color:#9f1239;"><strong>🚫 Account Suspended</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your account for <strong>${data.businessName || 'Business'}</strong> has been suspended.</p>
    ${data.reason ? `<div style="${styles.dangerBox}"><p style="margin:0;font-size:13px;color:#9f1239;"><strong>Reason:</strong> ${data.reason}</p></div>` : ''}
    <p style="font-size:14px;color:#64748b;">Contact support to resolve this.</p>
  `;
  return baseLayout(content, 'Account Suspended');
};

const accountReactivated = async (data) => {
  const content = `
    <div style="text-align:center;margin:16px 0;"><div style="width:64px;height:64px;background-color:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;"><span style="font-size:32px;">✅</span></div></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your <strong>${data.businessName || 'Business'}</strong> account has been <span style="color:#16a34a;font-weight:600;">reactivated</span>.</p>
    <div style="text-align:center;margin:24px 0;"><a href="${data.loginUrl || '#'}" style="${styles.button('#16a34a')}">Go to Dashboard</a></div>
  `;
  return baseLayout(content, 'Account Reactivated');
};

const supportTicketCreated = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your support ticket has been received.</p>
    <div style="${styles.infoBox}"><table style="${styles.detailTable}"><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Ticket ID</td><td style="${styles.detailValue}">#${data.ticketId || 'N/A'}</td></tr><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Subject</td><td style="${styles.detailValue}">${data.subject || 'N/A'}</td></tr><tr><td style="${styles.detailLabel}">Priority</td><td style="${styles.detailValue}">${(data.priority || 'N/A').toUpperCase()}</td></tr></table></div>
  `;
  return baseLayout(content, 'Support Ticket Received');
};

const supportTicketUpdated = async (data) => {
  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Ticket <strong>#${data.ticketId || 'N/A'}: ${data.subject || 'N/A'}</strong> has been updated.</p>
    <div style="${styles.infoBox}"><p style="margin:0;font-size:14px;">Status: <strong>${data.status || 'N/A'}</strong></p></div>
  `;
  return baseLayout(content, 'Ticket Updated');
};

const supportTicketResolved = async (data) => {
  const content = `
    <div style="${styles.successBox}"><p style="margin:0;font-size:14px;color:#166534;"><strong>✅ Ticket Resolved</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Hello ${data.name || 'there'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">Ticket <strong>#${data.ticketId || 'N/A'}: ${data.subject || 'N/A'}</strong> has been resolved.</p>
  `;
  return baseLayout(content, 'Ticket Resolved');
};

module.exports = {
  accountActivated, emailVerification, passwordReset, passwordChanged,
  subscriptionReceived, newSubscriptionAdmin, paymentReceipt,
  subscriptionRenewed, subscriptionExpiring, subscriptionExpired,
  trialEnding, trialEnded, accountSuspended, accountReactivated,
  supportTicketCreated, supportTicketUpdated, supportTicketResolved,
};