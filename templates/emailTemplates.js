/**
 * BizHub — Platform Email Templates
 * Single-file template registry.
 *
 * Sections:
 *   1.  Layout & helpers
 *   2.  Registration flow       (4)
 *   3.  Payment flow            (3)
 *   4.  Approval flow           (3)
 *   5.  Renewal flow            (5)
 *   6.  Upgrade flow            (3)
 *   7.  Security                (5)
 *   8.  Account management      (3)
 *   9.  Admin notifications     (7)
 *   10. Legacy compat aliases
 *
 * All templates return { subject, html }.
 * All are async (they hydrate brand/settings from DB, cached 60s).
 */

const env = require('../config/env');

/* ============================================================
 * 1. LAYOUT & HELPERS
 * ============================================================ */

let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 60_000;

const loadSettings = async () => {
  if (_cache && Date.now() - _cacheAt < CACHE_MS) return _cache;
  try {
    const Settings = require('../models/admin/Settings');
    const docs = await Settings.find({
      key: { $in: [
        'system_name', 'support_email', 'support_phone',
        'system_address', 'brand_color', 'logo_url',
      ] },
    }).lean();
    const map = {};
    docs.forEach((d) => { map[d.key] = d.value; });
    _cache = map;
    _cacheAt = Date.now();
    return map;
  } catch {
    return {};
  }
};

const getBrand = async () => {
  const s = await loadSettings();
  return {
    appName:      s.system_name    || env.APP_NAME || 'BizHub',
    supportEmail: s.support_email  || 'support@bizhub.co.ke',
    supportPhone: s.support_phone  || '+254 700 000 000',
    address:      s.system_address || 'Nairobi, Kenya',
    brandColor:   s.brand_color    || '#1a73e8',
    logoUrl:      s.logo_url       || '',
    clientUrl:    env.CLIENT_URL   || 'http://localhost:3000',
    adminUrl:     env.ADMIN_URL    || 'http://localhost:3001',
    year:         new Date().getFullYear(),
  };
};

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n, c = 'KES') =>
  `${c} ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

const dt = (d) =>
  d ? new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const dateOnly = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '—';

/**
 * Base layout — blue BizHub branding, responsive, dark-mode-safe.
 */
const base = async (content, title, opts = {}) => {
  const b = await getBrand();
  const accent = opts.accent || b.brandColor;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · ${esc(b.appName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
  <tr><td style="background:linear-gradient(135deg,${accent},${accent}dd);padding:32px 40px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.3px;">${esc(b.appName)}</h1>
    <p style="color:#dbeafe;margin:8px 0 0;font-size:14px;">Universal Business Management Suite</p>
  </td></tr>
  <tr><td style="background-color:#f8fafc;padding:18px 40px;border-bottom:1px solid #e2e8f0;">
    <h2 style="margin:0;font-size:18px;color:#1e293b;font-weight:600;">${esc(title)}</h2>
  </td></tr>
  <tr><td style="padding:32px 40px;">${content}</td></tr>
  <tr><td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 4px;font-size:13px;color:#64748b;">© ${b.year} ${esc(b.appName)}. All rights reserved.</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      <a href="mailto:${esc(b.supportEmail)}" style="color:#94a3b8;text-decoration:none;">${esc(b.supportEmail)}</a>
      ${b.supportPhone ? ` &nbsp;·&nbsp; ${esc(b.supportPhone)}` : ''}
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">${esc(b.address)}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

/* Shared inline styles */
const S = {
  p:       'font-size:15px;color:#475569;line-height:1.65;margin:0 0 16px;',
  muted:   'font-size:13px;color:#64748b;line-height:1.6;margin:12px 0;',
  infoBox: 'background:#f0f7ff;border-left:4px solid #1a73e8;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;',
  okBox:   'background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;',
  warnBox: 'background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;',
  badBox:  'background:#fff1f2;border-left:4px solid #e11d48;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;',
  tbl:     'width:100%;border-collapse:collapse;margin:16px 0;',
  row:     'border-bottom:1px solid #e2e8f0;',
  lbl:     'padding:8px 0;font-size:13px;color:#64748b;font-weight:500;',
  val:     'padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;',
};

const btn = (href, label, color = '#1a73e8') =>
  `<div style="text-align:center;margin:24px 0;">
     <a href="${esc(href)}" style="display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${esc(label)}</a>
   </div>`;

const row = (label, value, opts = {}) =>
  `<tr style="${S.row}">
     <td style="${S.lbl}">${esc(label)}</td>
     <td style="${S.val}${opts.color ? `color:${opts.color};` : ''}${opts.mono ? 'font-family:monospace;font-size:12px;' : ''}">${value}</td>
   </tr>`;

const detail = (rows) => `<table style="${S.tbl}">${rows.join('')}</table>`;

/* ============================================================
 * 2. REGISTRATION FLOW
 * ============================================================ */

/**
 * Sent immediately on register. Contains invoice + payment instructions.
 */
const tenantRegistrationPending = async (data) => {
  const {
    name, businessName, businessType, planName, planAmount, currency = 'KES',
    invoiceNumber, dueDate, paymentInstructions = [], invoiceUrl,
  } = data;

  const moduleMap = {
    restaurant: 'RestoManagerKE', pharmacy: 'PharmaSys',
    apartment: 'MyApartment', electronics: 'ElectroStore', cyber: 'DigitalManager',
  };
  const moduleName = moduleMap[businessType] || businessType;

  const instructionsHtml = paymentInstructions.map((p) => {
    const steps = (p.steps || []).map((s) => `<li style="margin:4px 0;">${esc(s)}</li>`).join('');
    return `<div style="background:#f0f9ff;padding:14px;border-radius:8px;margin:10px 0;border-left:4px solid #0369a1;">
      <p style="margin:0 0 6px;font-weight:700;color:#0c4a6e;">${esc(p.title || p.code)}</p>
      ${p.description ? `<p style="margin:4px 0;font-size:13px;color:#0c4a6e;">${esc(p.description)}</p>` : ''}
      ${steps ? `<ol style="margin:6px 0 0 0;padding-left:20px;font-size:13px;color:#0c4a6e;">${steps}</ol>` : ''}
    </div>`;
  }).join('');

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">
      Thanks for registering <strong>${esc(businessName)}</strong> on ${esc(moduleName)}.
      To activate your account, please complete payment of your invoice.
    </p>

    <div style="${S.infoBox}">
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e40af;">📋 Registration Summary</p>
      ${detail([
        row('Business', esc(businessName)),
        row('Module', esc(moduleName)),
        row('Plan', `${esc(planName)} · ${money(planAmount, currency)}`),
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Amount Due', money(planAmount, currency), { color: '#1a73e8' }),
        row('Pay Before', dt(dueDate), { color: '#f59e0b' }),
      ])}
    </div>

    ${instructionsHtml ? `
      <div style="margin:20px 0;">
        <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 8px;">💳 How to Pay</p>
        ${instructionsHtml}
      </div>` : ''}

    ${invoiceUrl ? btn(invoiceUrl, 'View Invoice & Pay', '#1a73e8') : ''}

    <div style="${S.warnBox}">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>⏰ Important:</strong> If we don't receive payment within 3 hours,
        your registration will be automatically cancelled.
      </p>
    </div>
  `, 'Complete Your Registration', { accent: '#1a73e8' });

  return {
    subject: `📋 Complete Registration — ${businessName}`,
    html,
  };
};

/**
 * Sent when invoice expires (3h no payment) and tenant is auto-rejected.
 */
const tenantAutoRejected = async (data) => {
  const { name, businessName, planName, invoiceNumber, registerUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>⏰ Registration Expired</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your registration for <strong>${esc(businessName)}</strong> on the
      <strong>${esc(planName)}</strong> plan has been automatically cancelled
      because we did not receive payment within 3 hours.
    </p>

    <div style="${S.warnBox}">
      <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:600;">What you can do:</p>
      <ol style="margin:0;padding-left:20px;font-size:13px;color:#92400e;">
        <li style="margin:4px 0;">Register again and complete payment immediately</li>
        <li style="margin:4px 0;">If you already paid, contact support with your M-Pesa code</li>
      </ol>
    </div>

    ${btn(registerUrl || `${b.clientUrl}/pricing`, 'Register Again', '#1a73e8')}
  `, 'Registration Expired', { accent: '#e11d48' });

  return {
    subject: `⏰ Registration Expired — ${businessName}`,
    html,
  };
};

/**
 * Sent when admin approves the tenant. Full welcome.
 */
const tenantApproved = async (data) => {
  const {
    name, businessName, businessType, planName, subscriptionStart, subscriptionExpiry,
    module, loginUrl, isLifetime = false,
  } = data;

  const moduleMap = {
    restaurant: 'RestoManagerKE', pharmacy: 'PharmaSys',
    apartment: 'MyApartment', electronics: 'ElectroStore', cyber: 'DigitalManager',
  };
  const moduleName = module || moduleMap[businessType] || businessType;
  const b = await getBrand();

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">✅</span>
      </div>
    </div>
    <h2 style="text-align:center;font-size:22px;color:#166534;margin:0 0 8px;">You're Approved, ${esc(name)}!</h2>
    <p style="${S.p};text-align:center;">
      Your <strong>${esc(businessName)}</strong> account on ${esc(moduleName)} is now active.
    </p>

    <div style="${S.okBox}">
      ${detail([
        row('Business', esc(businessName)),
        row('Module', esc(moduleName)),
        row('Plan', esc(planName)),
        row('Started', dateOnly(subscriptionStart)),
        isLifetime
          ? row('Access', 'Lifetime', { color: '#16a34a' })
          : row('Valid Until', dateOnly(subscriptionExpiry), { color: '#16a34a' }),
        row('Status', '✅ Active', { color: '#16a34a' }),
      ])}
    </div>

    <p style="${S.p}">You can now:</p>
    <ul style="font-size:14px;color:#475569;line-height:1.8;padding-left:20px;margin:0 0 8px;">
      <li>Add your products, staff, and customers</li>
      <li>Start selling and recording transactions</li>
      <li>Generate reports and monitor performance</li>
      <li>Receive real-time alerts and notifications</li>
    </ul>

    ${btn(loginUrl || `${b.clientUrl}/login`, 'Go to Dashboard', '#16a34a')}
  `, 'Account Activated', { accent: '#16a34a' });

  return {
    subject: `🎉 Welcome to ${b.appName} — Account Activated`,
    html,
  };
};

/**
 * Welcome — sent 5 minutes after approval as a warm hello.
 */
const tenantWelcome = async (data) => {
  const { name, businessName, businessType, dashboardUrl } = data;
  const moduleMap = {
    restaurant: 'RestoManagerKE', pharmacy: 'PharmaSys',
    apartment: 'MyApartment', electronics: 'ElectroStore', cyber: 'DigitalManager',
  };
  const moduleName = moduleMap[businessType] || businessType;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hi <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">
      Welcome aboard! We're thrilled to have <strong>${esc(businessName)}</strong>
      on ${esc(moduleName)}.
    </p>

    <div style="${S.infoBox}">
      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1e40af;">🚀 Quick Start Tips</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
        <li>Complete your business profile in Settings</li>
        <li>Add your products or services</li>
        <li>Invite your staff members</li>
        <li>Make your first sale or entry</li>
      </ol>
    </div>

    <p style="${S.muted}">
      Need help getting started? Reply to this email or call us —
      we're here to help.
    </p>

    ${btn(dashboardUrl || `${b.clientUrl}/login`, 'Open Dashboard', '#1a73e8')}
  `, 'Welcome to BizHub', { accent: '#1a73e8' });

  return {
    subject: `👋 Welcome to ${b.appName}, ${name}!`,
    html,
  };
};

/* ============================================================
 * 3. PAYMENT FLOW
 * ============================================================ */

/**
 * Sent when payment received (M-Pesa STK success or manual marked paid).
 * Notifies tenant that payment is confirmed, awaiting approval.
 */
const tenantPaymentReceived = async (data) => {
  const {
    name, invoiceNumber, amount, currency = 'KES',
    paymentMethod, paymentReference, paidAt, businessName,
  } = data;

  const methodLabels = {
    mpesa_stk: 'M-Pesa STK Push',
    mpesa_send: 'M-Pesa Send Money',
    mpesa_paybill: 'M-Pesa Paybill',
    mpesa_till: 'M-Pesa Till Number',
    manual: 'Manual Payment',
    bank: 'Bank Transfer',
    card: 'Card Payment',
  };

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">💳</span>
      </div>
    </div>
    <h2 style="text-align:center;font-size:20px;color:#166534;margin:0 0 8px;">Payment Received</h2>
    <p style="${S.p};text-align:center;">
      Thank you, <strong>${esc(name)}</strong>! We've received your payment.
    </p>

    <div style="${S.okBox}">
      ${detail([
        row('Business', esc(businessName)),
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Amount Paid', money(amount, currency), { color: '#16a34a' }),
        row('Method', esc(methodLabels[paymentMethod] || paymentMethod)),
        paymentReference
          ? row('Reference', esc(paymentReference), { mono: true })
          : '',
        row('Paid At', dt(paidAt)),
      ].filter(Boolean))}
    </div>

    <div style="${S.infoBox}">
      <p style="margin:0 0 6px;font-weight:600;color:#1e40af;">⏳ What happens next</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
        <li>Our team verifies your payment</li>
        <li>Your account is approved and activated</li>
        <li>You receive a confirmation email with login link</li>
      </ol>
      <p style="margin:8px 0 0;font-size:13px;color:#1e40af;">
        Usually takes less than 24 hours.
      </p>
    </div>
  `, 'Payment Confirmed', { accent: '#16a34a' });

  return {
    subject: `✅ Payment Received — Invoice ${invoiceNumber}`,
    html,
  };
};

/**
 * Sent as reminder before invoice expires.
 */
const tenantInvoiceReminder = async (data) => {
  const {
    name, businessName, invoiceNumber, amountDue, currency = 'KES',
    dueDate, paymentInstructions = [], invoiceUrl, minutesLeft,
  } = data;

  const instructionsHtml = paymentInstructions.map((p) =>
    `<li style="margin:6px 0;font-size:13px;">
       <strong>${esc(p.title || p.code)}</strong>
       ${p.description ? ` — ${esc(p.description)}` : ''}
     </li>`
  ).join('');

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.warnBox}">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>⏰ Invoice due soon</strong>
        ${minutesLeft ? ` — ${esc(minutesLeft)} minutes remaining` : ''}
      </p>
    </div>

    <p style="${S.p}">
      Your invoice for <strong>${esc(businessName)}</strong> is still unpaid.
      Please complete payment to avoid registration cancellation.
    </p>

    <div style="${S.infoBox}">
      ${detail([
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Amount Due', money(amountDue, currency), { color: '#f59e0b' }),
        row('Due By', dt(dueDate), { color: '#e11d48' }),
      ])}
    </div>

    ${instructionsHtml ? `
      <div style="margin:16px 0;">
        <p style="font-size:14px;font-weight:600;margin:0 0 8px;">💳 Pay Now</p>
        <ul style="padding-left:20px;margin:0;">${instructionsHtml}</ul>
      </div>` : ''}

    ${invoiceUrl ? btn(invoiceUrl, 'Pay Now', '#f59e0b') : ''}
  `, 'Payment Reminder', { accent: '#f59e0b' });

  return {
    subject: `⏰ Reminder: Invoice ${invoiceNumber} due soon`,
    html,
  };
};

/**
 * Formal payment receipt (issued on demand or auto after approval).
 */
const tenantPaymentReceipt = async (data) => {
  const {
    name, businessName, invoiceNumber, amountPaid, currency = 'KES',
    paymentMethod, paymentReference, paidAt, planName, nextBillingDate,
  } = data;

  const b = await getBrand();
  const methodLabels = {
    mpesa_stk: 'M-Pesa STK Push',
    mpesa_send: 'M-Pesa Send Money',
    mpesa_paybill: 'M-Pesa Paybill',
    mpesa_till: 'M-Pesa Till Number',
    manual: 'Manual Payment',
    bank: 'Bank Transfer',
    card: 'Card Payment',
  };

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <h2 style="margin:0;font-size:22px;color:#1e293b;">Payment Receipt</h2>
      <p style="margin:6px 0 0;font-size:13px;color:#64748b;">${esc(b.appName)}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;padding:16px;">
      ${detail([
        row('Receipt For', esc(businessName)),
        row('Customer', esc(name)),
        row('Plan', esc(planName)),
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Amount Paid', money(amountPaid, currency), { color: '#16a34a' }),
        row('Method', esc(methodLabels[paymentMethod] || paymentMethod)),
        paymentReference ? row('Reference', esc(paymentReference), { mono: true }) : '',
        row('Paid On', dt(paidAt)),
        nextBillingDate ? row('Next Billing', dateOnly(nextBillingDate)) : '',
      ].filter(Boolean))}
    </table>

    <p style="${S.muted};text-align:center;margin-top:24px;">
      This is a computer-generated receipt. No signature required.
    </p>

    <p style="${S.muted};text-align:center;">
      Questions? Contact <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a>
    </p>
  `, 'Payment Receipt', { accent: '#16a34a' });

  return {
    subject: `🧾 Receipt — ${invoiceNumber}`,
    html,
  };
};

/* ============================================================
 * 4. APPROVAL FLOW
 * ============================================================ */

/**
 * Sent when admin rejects registration (even if payment was made).
 */
const tenantRejected = async (data) => {
  const { name, businessName, reason, supportEmail, refundInfo } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>Registration Not Approved</strong>
      </p>
    </div>

    <p style="${S.p}">
      Unfortunately, we were unable to approve your registration for
      <strong>${esc(businessName)}</strong>.
    </p>

    ${reason ? `
      <div style="${S.infoBox}">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Reason</p>
        <p style="margin:0;font-size:14px;color:#1e293b;">${esc(reason)}</p>
      </div>` : ''}

    ${refundInfo ? `
      <div style="${S.okBox}">
        <p style="margin:0;font-size:13px;color:#166534;">
          <strong>💰 Refund:</strong> ${esc(refundInfo)}
        </p>
      </div>` : ''}

    <p style="${S.p}">
      If you believe this is a mistake, please contact us.
    </p>

    <p style="${S.muted};text-align:center;">
      📧 <a href="mailto:${esc(supportEmail || b.supportEmail)}" style="color:#1a73e8;">${esc(supportEmail || b.supportEmail)}</a><br>
      📞 ${esc(b.supportPhone)}
    </p>
  `, 'Registration Update', { accent: '#e11d48' });

  return {
    subject: `Registration Update — ${businessName}`,
    html,
  };
};

/**
 * Sent when admin suspends an active tenant.
 */
const tenantSuspended = async (data) => {
  const { name, businessName, reason } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>🚫 Account Suspended</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your <strong>${esc(businessName)}</strong> account has been suspended.
      You will not be able to log in or use the platform until this is resolved.
    </p>

    ${reason ? `
      <div style="${S.infoBox}">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Reason</p>
        <p style="margin:0;font-size:14px;color:#1e293b;">${esc(reason)}</p>
      </div>` : ''}

    <p style="${S.p}">Contact support to resolve this.</p>

    <p style="${S.muted};text-align:center;">
      📧 <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a><br>
      📞 ${esc(b.supportPhone)}
    </p>
  `, 'Account Suspended', { accent: '#e11d48' });

  return {
    subject: `🚫 Account Suspended — ${businessName}`,
    html,
  };
};

/**
 * Sent when admin reactivates a suspended tenant.
 */
const tenantReactivated = async (data) => {
  const { name, businessName, loginUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">🎉</span>
      </div>
    </div>
    <h2 style="text-align:center;font-size:20px;color:#166534;margin:0 0 8px;">Welcome Back!</h2>
    <p style="${S.p};text-align:center;">
      Your <strong>${esc(businessName)}</strong> account has been reactivated.
    </p>

    <div style="${S.okBox}">
      <p style="margin:0;font-size:14px;color:#166534;">
        You can log in and continue using the platform as before.
      </p>
    </div>

    ${btn(loginUrl || `${b.clientUrl}/login`, 'Log In', '#16a34a')}
  `, 'Account Reactivated', { accent: '#16a34a' });

  return {
    subject: `✅ Account Reactivated — ${businessName}`,
    html,
  };
};

/* ============================================================
 * 5. RENEWAL FLOW
 * ============================================================ */

const tenantRenewalRequested = async (data) => {
  const {
    name, businessName, planName, amount, currency = 'KES',
    invoiceNumber, dueDate, paymentInstructions = [], invoiceUrl,
  } = data;

  const instructionsHtml = paymentInstructions.map((p) => {
    const steps = (p.steps || []).map((s) => `<li style="margin:4px 0;">${esc(s)}</li>`).join('');
    return `<div style="background:#f0f9ff;padding:14px;border-radius:8px;margin:10px 0;border-left:4px solid #0369a1;">
      <p style="margin:0 0 6px;font-weight:700;color:#0c4a6e;">${esc(p.title || p.code)}</p>
      ${p.description ? `<p style="margin:4px 0;font-size:13px;color:#0c4a6e;">${esc(p.description)}</p>` : ''}
      ${steps ? `<ol style="margin:6px 0 0;padding-left:20px;font-size:13px;color:#0c4a6e;">${steps}</ol>` : ''}
    </div>`;
  }).join('');

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">
      We've received your renewal request for <strong>${esc(businessName)}</strong>.
      Complete payment to reactivate your subscription.
    </p>

    <div style="${S.infoBox}">
      ${detail([
        row('Business', esc(businessName)),
        row('Plan', esc(planName)),
        row('Amount', money(amount, currency)),
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Pay Before', dt(dueDate), { color: '#f59e0b' }),
      ])}
    </div>

    ${instructionsHtml ? `
      <div style="margin:16px 0;">
        <p style="font-size:14px;font-weight:600;margin:0 0 8px;">💳 How to Pay</p>
        ${instructionsHtml}
      </div>` : ''}

    ${invoiceUrl ? btn(invoiceUrl, 'Pay Now', '#1a73e8') : ''}
  `, 'Renewal Request Received', { accent: '#1a73e8' });

  return {
    subject: `🔄 Renewal Invoice — ${businessName}`,
    html,
  };
};

const tenantRenewalApproved = async (data) => {
  const {
    name, businessName, planName, newExpiry,
    renewalCount, loginUrl,
  } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">🔄</span>
      </div>
    </div>
    <h2 style="text-align:center;font-size:20px;color:#166534;margin:0 0 8px;">Renewal Approved</h2>
    <p style="${S.p};text-align:center;">
      Your subscription for <strong>${esc(businessName)}</strong> is active again.
    </p>

    <div style="${S.okBox}">
      ${detail([
        row('Plan', esc(planName)),
        row('New Expiry', dateOnly(newExpiry), { color: '#16a34a' }),
        renewalCount ? row('Renewal #', String(renewalCount)) : '',
        row('Status', '✅ Active', { color: '#16a34a' }),
      ].filter(Boolean))}
    </div>

    ${btn(loginUrl || `${b.clientUrl}/login`, 'Go to Dashboard', '#16a34a')}
  `, 'Renewal Approved', { accent: '#16a34a' });

  return {
    subject: `✅ Renewal Approved — ${businessName}`,
    html,
  };
};

const tenantRenewalRejected = async (data) => {
  const { name, businessName, reason, renewalUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>Renewal Not Approved</strong>
      </p>
    </div>

    <p style="${S.p}">
      Unfortunately, we couldn't process your renewal for <strong>${esc(businessName)}</strong>.
    </p>

    ${reason ? `
      <div style="${S.infoBox}">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Reason</p>
        <p style="margin:0;font-size:14px;color:#1e293b;">${esc(reason)}</p>
      </div>` : ''}

    <p style="${S.p}">You can try again or contact support for assistance.</p>

    ${btn(renewalUrl || `${b.clientUrl}/renewal`, 'Try Again', '#1a73e8')}
  `, 'Renewal Update', { accent: '#e11d48' });

  return {
    subject: `Renewal Update — ${businessName}`,
    html,
  };
};

const tenantSubscriptionExpired = async (data) => {
  const { name, businessName, planName, expiredAt, renewalUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.warnBox}">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>⏰ Subscription Expired</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your <strong>${esc(planName)}</strong> subscription for
      <strong>${esc(businessName)}</strong> expired on ${dateOnly(expiredAt)}.
    </p>

    <p style="${S.p}">
      To regain access, renew your subscription now.
    </p>

    ${btn(renewalUrl || `${b.clientUrl}/renewal`, 'Renew Now', '#f59e0b')}

    <p style="${S.muted};text-align:center;">
      Need help? <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a>
    </p>
  `, 'Subscription Expired', { accent: '#f59e0b' });

  return {
    subject: `⏰ Subscription Expired — ${businessName}`,
    html,
  };
};

const tenantSubscriptionExpiring = async (data) => {
  const { name, businessName, planName, expiryDate, daysLeft, renewalUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.warnBox}">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>
      </p>
    </div>

    <div style="${S.infoBox}">
      ${detail([
        row('Business', esc(businessName)),
        row('Plan', esc(planName)),
        row('Expires', dateOnly(expiryDate), { color: '#f59e0b' }),
      ])}
    </div>

    <p style="${S.p}">Renew early to avoid interruption.</p>

    ${btn(renewalUrl || `${b.clientUrl}/renewal`, 'Renew Now', '#1a73e8')}
  `, 'Subscription Expiring Soon', { accent: '#f59e0b' });

  return {
    subject: `⏰ Subscription expires in ${daysLeft} days — ${businessName}`,
    html,
  };
};

/* ============================================================
 * 6. UPGRADE FLOW
 * ============================================================ */

const tenantUpgradeRequested = async (data) => {
  const {
    name, businessName, oldPlan, newPlan, amount, currency = 'KES',
    invoiceNumber, dueDate, paymentInstructions = [], invoiceUrl,
  } = data;

  const instructionsHtml = paymentInstructions.map((p) => {
    const steps = (p.steps || []).map((s) => `<li style="margin:4px 0;">${esc(s)}</li>`).join('');
    return `<div style="background:#f0f9ff;padding:14px;border-radius:8px;margin:10px 0;border-left:4px solid #0369a1;">
      <p style="margin:0 0 6px;font-weight:700;color:#0c4a6e;">${esc(p.title || p.code)}</p>
      ${steps ? `<ol style="margin:6px 0 0;padding-left:20px;font-size:13px;color:#0c4a6e;">${steps}</ol>` : ''}
    </div>`;
  }).join('');

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">
      We've received your upgrade request for <strong>${esc(businessName)}</strong>.
    </p>

    <div style="${S.infoBox}">
      ${detail([
        row('From', esc(oldPlan)),
        row('To', esc(newPlan), { color: '#1a73e8' }),
        row('Amount', money(amount, currency)),
        row('Invoice', esc(invoiceNumber), { mono: true }),
        row('Pay Before', dt(dueDate), { color: '#f59e0b' }),
      ])}
    </div>

    ${instructionsHtml}

    ${invoiceUrl ? btn(invoiceUrl, 'Complete Upgrade', '#1a73e8') : ''}
  `, 'Upgrade Request Received', { accent: '#1a73e8' });

  return {
    subject: `⬆️ Upgrade Request — ${businessName}`,
    html,
  };
};

const tenantUpgradeApproved = async (data) => {
  const { name, businessName, newPlan, loginUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">⬆️</span>
      </div>
    </div>
    <h2 style="text-align:center;font-size:20px;color:#166534;margin:0 0 8px;">Upgrade Approved</h2>
    <p style="${S.p};text-align:center;">
      You're now on the <strong>${esc(newPlan)}</strong> plan.
    </p>

    <div style="${S.okBox}">
      <p style="margin:0;font-size:14px;color:#166534;">
        Your new features and limits are active immediately.
      </p>
    </div>

    ${btn(loginUrl || `${b.clientUrl}/login`, 'Explore New Features', '#16a34a')}
  `, 'Upgrade Approved', { accent: '#16a34a' });

  return {
    subject: `🎉 Upgrade Approved — You're on ${newPlan}!`,
    html,
  };
};

const tenantUpgradeRejected = async (data) => {
  const { name, businessName, reason } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>Upgrade Not Approved</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your upgrade request for <strong>${esc(businessName)}</strong> was not approved.
      You remain on your current plan.
    </p>

    ${reason ? `
      <div style="${S.infoBox}">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Reason</p>
        <p style="margin:0;font-size:14px;color:#1e293b;">${esc(reason)}</p>
      </div>` : ''}

    <p style="${S.muted};text-align:center;">
      Need help? <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a>
    </p>
  `, 'Upgrade Update', { accent: '#e11d48' });

  return {
    subject: `Upgrade Update — ${businessName}`,
    html,
  };
};

/* ============================================================
 * 7. SECURITY
 * ============================================================ */

const newDeviceLogin = async (data) => {
  const { name, device, ip, location, when, secureUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.infoBox}">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e40af;">
        🔐 New Login Detected
      </p>
      <p style="margin:0;font-size:14px;color:#475569;">
        Your ${esc(b.appName)} account was just accessed from a new device.
      </p>
    </div>

    <div style="${S.tbl}">
      ${detail([
        row('Device', esc(device || 'Unknown')),
        row('IP Address', esc(ip || 'Unknown'), { mono: true }),
        location ? row('Location', esc(location)) : '',
        row('Time', dt(when)),
      ].filter(Boolean))}
    </div>

    <p style="${S.p}"><strong>Was this you?</strong></p>
    <ul style="font-size:14px;color:#475569;line-height:1.8;padding-left:20px;">
      <li>If yes, no action needed.</li>
      <li>If no, change your password immediately and log out of all devices.</li>
    </ul>

    ${btn(secureUrl || `${b.clientUrl}/settings/security`, 'Secure My Account', '#e11d48')}
  `, 'New Device Login', { accent: '#e11d48' });

  return {
    subject: `🔐 New login to your ${b.appName} account`,
    html,
  };
};

const suspiciousActivity = async (data) => {
  const { name, attempts, ip, when, resetUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>⚠️ Multiple Failed Login Attempts</strong>
      </p>
    </div>

    <p style="${S.p}">
      We detected <strong>${attempts}</strong> failed login attempts on your account.
    </p>

    <div style="${S.tbl}">
      ${detail([
        row('IP Address', esc(ip || 'Unknown'), { mono: true }),
        row('Last Attempt', dt(when)),
      ])}
    </div>

    <p style="${S.p}">
      If this wasn't you, we recommend resetting your password right away.
    </p>

    ${btn(resetUrl || `${b.clientUrl}/forgot-password`, 'Reset Password', '#e11d48')}
  `, 'Suspicious Activity Detected', { accent: '#e11d48' });

  return {
    subject: `⚠️ Suspicious activity on your ${b.appName} account`,
    html,
  };
};

const passwordChangedAlert = async (data) => {
  const { name, when, ip, supportUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.okBox}">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>✅ Password Changed</strong>
      </p>
    </div>

    <p style="${S.p}">Your ${esc(b.appName)} password was changed successfully.</p>

    ${detail([
      row('Time', dt(when)),
      ip ? row('IP Address', esc(ip), { mono: true }) : '',
    ].filter(Boolean))}

    <p style="${S.muted}">
      If this wasn't you, contact support immediately.
    </p>
  `, 'Password Changed', { accent: '#16a34a' });

  return {
    subject: `Your ${b.appName} password was changed`,
    html,
  };
};

const emailChangedAlert = async (data) => {
  const { name, oldEmail, newEmail, when, supportUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.infoBox}">
      <p style="margin:0;font-size:14px;color:#1e40af;">
        <strong>📧 Email Address Changed</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your ${esc(b.appName)} account email address was changed.
    </p>

    ${detail([
      row('Old Email', esc(oldEmail)),
      row('New Email', esc(newEmail), { color: '#1a73e8' }),
      row('Changed At', dt(when)),
    ])}

    <p style="${S.muted}">
      If this wasn't you, contact support immediately at
      <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a>.
    </p>
  `, 'Email Address Changed', { accent: '#1a73e8' });

  return {
    subject: `Your ${b.appName} email was changed`,
    html,
  };
};

const accountLocked = async (data) => {
  const { name, unlockAt, supportEmail } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.badBox}">
      <p style="margin:0;font-size:14px;color:#9f1239;">
        <strong>🔒 Account Temporarily Locked</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your account has been locked due to multiple failed login attempts.
    </p>

    ${unlockAt ? `<p style="${S.p}">It will unlock automatically on <strong>${dt(unlockAt)}</strong>.</p>` : ''}

    <p style="${S.muted};text-align:center;">
      Contact: <a href="mailto:${esc(supportEmail || b.supportEmail)}" style="color:#1a73e8;">${esc(supportEmail || b.supportEmail)}</a>
    </p>
  `, 'Account Locked', { accent: '#e11d48' });

  return {
    subject: `🔒 Your ${b.appName} account is locked`,
    html,
  };
};

/* ============================================================
 * 8. ACCOUNT MANAGEMENT
 * ============================================================ */

const emailVerification = async (data) => {
  const { name, token, verifyUrl } = data;
  const b = await getBrand();
  const url = verifyUrl || `${b.clientUrl}/verify-email?token=${encodeURIComponent(token || '')}`;

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">Welcome to ${esc(b.appName)}! Please verify your email address to get started.</p>

    ${btn(url, 'Verify Email Address', '#1a73e8')}

    <div style="${S.infoBox}">
      <p style="margin:0;font-size:13px;color:#1e40af;">
        <strong>This link expires in 1 hour.</strong>
      </p>
    </div>

    <p style="${S.muted}">
      If you didn't create a ${esc(b.appName)} account, ignore this email.
    </p>
  `, 'Verify Your Email', { accent: '#1a73e8' });

  return {
    subject: `Verify your ${b.appName} email address`,
    html,
  };
};

const passwordReset = async (data) => {
  const { name, token, resetUrl } = data;
  const b = await getBrand();
  const url = resetUrl || `${b.clientUrl}/reset-password?token=${encodeURIComponent(token || '')}`;

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">
      We received a request to reset your ${esc(b.appName)} password.
      Click the button below to choose a new one.
    </p>

    ${btn(url, 'Reset Password', '#f59e0b')}

    <div style="${S.warnBox}">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>⏰ This link expires in 30 minutes.</strong>
      </p>
    </div>

    <p style="${S.muted}">
      Didn't request this? You can safely ignore this email —
      your password will remain unchanged.
    </p>
  `, 'Reset Your Password', { accent: '#f59e0b' });

  return {
    subject: `Reset your ${b.appName} password`,
    html,
  };
};

const passwordChanged = async (data) => {
  const { name } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>

    <div style="${S.okBox}">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>✅ Password changed successfully.</strong>
      </p>
    </div>

    <p style="${S.p}">
      Your ${esc(b.appName)} password was just changed. You can now log in with your new password.
    </p>

    <p style="${S.muted}">
      If this wasn't you, contact support immediately at
      <a href="mailto:${esc(b.supportEmail)}" style="color:#1a73e8;">${esc(b.supportEmail)}</a>.
    </p>
  `, 'Password Changed', { accent: '#16a34a' });

  return {
    subject: `Your ${b.appName} password was changed`,
    html,
  };
};

/* ============================================================
 * 9. ADMIN NOTIFICATIONS
 * ============================================================ */

const adminNewRegistration = async (data) => {
  const {
    businessName, ownerName, ownerEmail, ownerPhone,
    planName, amount, currency = 'KES', planCycle,
    invoiceNumber, businessType, moduleName, registerUrl,
  } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="${S.infoBox}">
      <p style="margin:0;font-size:14px;color:#1e40af;">
        <strong>📥 New Registration</strong> — awaiting payment
      </p>
    </div>

    ${detail([
      row('Business', esc(businessName)),
      row('Type', esc(businessType || '—')),
      row('Module', esc(moduleName || businessType || '—')),
      row('Owner', esc(ownerName)),
      row('Email', esc(ownerEmail)),
      row('Phone', esc(ownerPhone)),
      row('Plan', esc(planName)),
      row('Cycle', esc(planCycle || '—')),
      row('Amount', money(amount, currency), { color: '#1a73e8' }),
      invoiceNumber ? row('Invoice', esc(invoiceNumber), { mono: true }) : '',
    ].filter(Boolean))}

    ${btn(registerUrl || `${b.adminUrl}/approvals`, 'Open Approvals', '#1a73e8')}
  `, 'New Registration', { accent: '#1a73e8' });

  return {
    subject: `📥 New registration: ${businessName}`,
    html,
  };
};

const adminPaymentReceived = async (data) => {
  const {
    businessName, ownerName, ownerEmail, ownerPhone,
    planName, amount, currency = 'KES', invoiceNumber,
    paymentMethod, reference, reviewUrl,
  } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="${S.okBox}">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>💳 Payment Received</strong> — ready for review
      </p>
    </div>

    ${detail([
      row('Business', esc(businessName)),
      row('Owner', esc(ownerName)),
      row('Email', esc(ownerEmail)),
      row('Phone', esc(ownerPhone)),
      row('Plan', esc(planName)),
      row('Amount', money(amount, currency), { color: '#16a34a' }),
      row('Method', esc(paymentMethod || '—')),
      reference ? row('Reference', esc(reference), { mono: true }) : '',
      invoiceNumber ? row('Invoice', esc(invoiceNumber), { mono: true }) : '',
    ].filter(Boolean))}

    ${btn(reviewUrl || `${b.adminUrl}/approvals`, 'Review & Approve', '#16a34a')}
  `, 'Payment Received', { accent: '#16a34a' });

  return {
    subject: `💳 Payment received: ${businessName}`,
    html,
  };
};

const adminRenewalRequest = async (data) => {
  const {
    businessName, ownerName, ownerEmail, ownerPhone,
    planName, amount, currency = 'KES', invoiceNumber, reviewUrl,
  } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="${S.infoBox}">
      <p style="margin:0;font-size:14px;color:#1e40af;">
        <strong>🔄 Renewal Request</strong>
      </p>
    </div>

    ${detail([
      row('Business', esc(businessName)),
      row('Owner', esc(ownerName)),
      row('Email', esc(ownerEmail)),
      row('Phone', esc(ownerPhone)),
      row('Plan', esc(planName)),
      row('Amount', money(amount, currency)),
      invoiceNumber ? row('Invoice', esc(invoiceNumber), { mono: true }) : '',
    ].filter(Boolean))}

    ${btn(reviewUrl || `${b.adminUrl}/approvals`, 'Review Renewal', '#1a73e8')}
  `, 'Renewal Request', { accent: '#1a73e8' });

  return {
    subject: `🔄 Renewal request: ${businessName}`,
    html,
  };
};

const adminUpgradeRequest = async (data) => {
  const {
    businessName, ownerName, ownerEmail,
    oldPlan, newPlan, amount, currency = 'KES',
    invoiceNumber, reviewUrl,
  } = data;
  const b = await getBrand();

  const html = await base(`
    <div style="${S.infoBox}">
      <p style="margin:0;font-size:14px;color:#1e40af;">
        <strong>⬆️ Upgrade Request</strong>
      </p>
    </div>

    ${detail([
      row('Business', esc(businessName)),
      row('Owner', esc(ownerName)),
      row('Email', esc(ownerEmail)),
      row('From', esc(oldPlan)),
      row('To', esc(newPlan), { color: '#1a73e8' }),
      row('Amount', money(amount, currency)),
      invoiceNumber ? row('Invoice', esc(invoiceNumber), { mono: true }) : '',
    ].filter(Boolean))}

    ${btn(reviewUrl || `${b.adminUrl}/approvals`, 'Review Upgrade', '#1a73e8')}
  `, 'Upgrade Request', { accent: '#1a73e8' });

  return {
    subject: `⬆️ Upgrade request: ${businessName}`,
    html,
  };
};

const adminDailyDigest = async (data) => {
  const {
    stats = {},
    recentRegistrations = [],
    recentPayments = [],
    pendingApprovals = 0,
    dashboardUrl,
  } = data;
  const b = await getBrand();

  const registrationsHtml = recentRegistrations.slice(0, 5).map((r) =>
    `<tr style="${S.row}">
      <td style="${S.lbl}">${esc(r.businessName)}</td>
      <td style="${S.val}">${esc(r.planName || '—')}</td>
     </tr>`
  ).join('');

  const paymentsHtml = recentPayments.slice(0, 5).map((p) =>
    `<tr style="${S.row}">
      <td style="${S.lbl}">${esc(p.businessName)}</td>
      <td style="${S.val};color:#16a34a;">${money(p.amount, p.currency || 'KES')}</td>
     </tr>`
  ).join('');

  const html = await base(`
    <p style="${S.p}"><strong>${dateOnly(new Date())}</strong> — Daily Summary</p>

    <div style="${S.infoBox}">
      ${detail([
        row('New Registrations', String(stats.newRegistrations || 0)),
        row('Payments Received', String(stats.paymentsReceived || 0)),
        row('Revenue Today', money(stats.revenueToday || 0, 'KES'), { color: '#16a34a' }),
        row('Pending Approvals', String(pendingApprovals), { color: pendingApprovals > 0 ? '#f59e0b' : '#16a34a' }),
      ])}
    </div>

    ${registrationsHtml ? `
      <p style="font-size:14px;font-weight:600;margin:20px 0 8px;">📥 Recent Registrations</p>
      <table style="${S.tbl}">${registrationsHtml}</table>` : ''}

    ${paymentsHtml ? `
      <p style="font-size:14px;font-weight:600;margin:20px 0 8px;">💳 Recent Payments</p>
      <table style="${S.tbl}">${paymentsHtml}</table>` : ''}

    ${btn(dashboardUrl || `${b.adminUrl}/dashboard`, 'Open Admin Panel', '#1a73e8')}
  `, 'Daily Digest', { accent: '#1a73e8' });

  return {
    subject: `📊 Daily Summary — ${dateOnly(new Date())}`,
    html,
  };
};

const adminWeeklyReport = async (data) => {
  const { stats = {}, periodLabel, dashboardUrl } = data;
  const b = await getBrand();

  const html = await base(`
    <p style="${S.p}"><strong>${esc(periodLabel || 'This Week')}</strong></p>

    <div style="${S.infoBox}">
      ${detail([
        row('New Tenants', String(stats.newTenants || 0)),
        row('Active Tenants', String(stats.activeTenants || 0)),
        row('Total Revenue', money(stats.revenue || 0, 'KES'), { color: '#16a34a' }),
        row('Renewals', String(stats.renewals || 0)),
        row('Churn', String(stats.churn || 0), { color: '#e11d48' }),
        row('Trial → Paid Conversion', `${stats.conversionRate || 0}%`),
      ])}
    </div>

    ${btn(dashboardUrl || `${b.adminUrl}/analytics`, 'View Full Report', '#1a73e8')}
  `, 'Weekly Report', { accent: '#1a73e8' });

  return {
    subject: `📈 Weekly Report — ${esc(periodLabel || 'This Week')}`,
    html,
  };
};

const adminSystemAlert = async (data) => {
  const { level = 'warning', title, message, details = {}, dashboardUrl } = data;
  const b = await getBrand();

  const box = level === 'critical' ? S.badBox
            : level === 'warning'  ? S.warnBox
            : S.infoBox;
  const icon = level === 'critical' ? '🚨'
             : level === 'warning'  ? '⚠️'
             : 'ℹ️';
  const color = level === 'critical' ? '#9f1239'
              : level === 'warning'  ? '#92400e'
              : '#1e40af';

  const detailsRows = Object.entries(details).map(([k, v]) =>
    row(k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), esc(String(v)))
  );

  const html = await base(`
    <div style="${box}">
      <p style="margin:0;font-size:14px;color:${color};">
        <strong>${icon} ${esc(title || 'System Alert')}</strong>
      </p>
    </div>

    ${message ? `<p style="${S.p}">${esc(message)}</p>` : ''}

    ${detailsRows.length ? detail(detailsRows) : ''}

    ${dashboardUrl ? btn(dashboardUrl, 'Investigate', color) : ''}
  `, `${level.toUpperCase()}: ${title || 'System Alert'}`, {
    accent: level === 'critical' ? '#e11d48'
          : level === 'warning'  ? '#f59e0b'
          : '#1a73e8',
  });

  return {
    subject: `${icon} ${level.toUpperCase()}: ${title || 'System Alert'}`,
    html,
  };
};

/* ============================================================
 * 10. LEGACY COMPAT ALIASES
 * (so existing code doesn't break during migration)
 * ============================================================ */

const accountActivated = tenantApproved;
const emailVerify      = emailVerification;
const passwordResetAlias = passwordReset;   // already defined above
const subscriptionReceived = tenantRegistrationPending;
const newSubscriptionAdmin  = adminNewRegistration;
const subscriptionRenewed   = tenantRenewalApproved;
const subscriptionExpiring  = tenantSubscriptionExpiring;
const subscriptionExpired   = tenantSubscriptionExpired;
const accountSuspended      = tenantSuspended;
const accountReactivated    = tenantReactivated;
const paymentReceipt        = tenantPaymentReceipt;

/* Trial templates — kept for backward compat, deprecated */
const trialEnding = async (data) => {
  const { name, businessName, daysLeft, upgradeUrl } = data;
  const b = await getBrand();
  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">Your free trial for <strong>${esc(businessName)}</strong> ends in <strong>${daysLeft}</strong> day(s).</p>
    ${btn(upgradeUrl || `${b.clientUrl}/pricing`, 'Choose a Plan', '#1a73e8')}
  `, 'Trial Ending Soon', { accent: '#1a73e8' });
  return { subject: `Trial ends in ${daysLeft} days — ${businessName}`, html };
};

const trialEnded = async (data) => {
  const { name, businessName, upgradeUrl } = data;
  const b = await getBrand();
  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <div style="${S.badBox}"><p style="margin:0;color:#9f1239;"><strong>Your free trial for ${esc(businessName)} has ended.</strong></p></div>
    ${btn(upgradeUrl || `${b.clientUrl}/pricing`, 'Subscribe Now', '#e11d48')}
  `, 'Trial Ended', { accent: '#e11d48' });
  return { subject: `Trial ended — ${businessName}`, html };
};

/* Support ticket — kept */
const supportTicketCreated = async (data) => {
  const { name, ticketId, subject, priority } = data;
  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">Your support ticket has been received.</p>
    ${detail([
      row('Ticket ID', `#${esc(ticketId)}`, { mono: true }),
      row('Subject', esc(subject)),
      row('Priority', esc((priority || 'medium').toUpperCase())),
    ])}
  `, 'Support Ticket Received', { accent: '#1a73e8' });
  return { subject: `Support ticket #${ticketId} received`, html };
};

const supportTicketUpdated = async (data) => {
  const { name, ticketId, subject, status } = data;
  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <p style="${S.p}">Your ticket has been updated.</p>
    ${detail([
      row('Ticket', `#${esc(ticketId)}`, { mono: true }),
      row('Subject', esc(subject)),
      row('Status', esc(status)),
    ])}
  `, 'Ticket Updated', { accent: '#1a73e8' });
  return { subject: `Ticket #${ticketId} updated`, html };
};

const supportTicketResolved = async (data) => {
  const { name, ticketId, subject } = data;
  const html = await base(`
    <p style="${S.p}">Hello <strong>${esc(name)}</strong>,</p>
    <div style="${S.okBox}"><p style="margin:0;color:#166534;"><strong>✅ Ticket Resolved</strong></p></div>
    ${detail([
      row('Ticket', `#${esc(ticketId)}`, { mono: true }),
      row('Subject', esc(subject)),
    ])}
  `, 'Ticket Resolved', { accent: '#16a34a' });
  return { subject: `Ticket #${ticketId} resolved`, html };
};

/* ============================================================
 * EXPORTS
 * ============================================================ */

module.exports = {
  /* helpers */
  getBrand,
  base,
  detail,
  row,

  /* 2. Registration */
  tenantRegistrationPending,
  tenantAutoRejected,
  tenantApproved,
  tenantWelcome,

  /* 3. Payment */
  tenantPaymentReceived,
  tenantInvoiceReminder,
  tenantPaymentReceipt,

  /* 4. Approval */
  tenantRejected,
  tenantSuspended,
  tenantReactivated,

  /* 5. Renewal */
  tenantRenewalRequested,
  tenantRenewalApproved,
  tenantRenewalRejected,
  tenantSubscriptionExpired,
  tenantSubscriptionExpiring,

  /* 6. Upgrade */
  tenantUpgradeRequested,
  tenantUpgradeApproved,
  tenantUpgradeRejected,

  /* 7. Security */
  newDeviceLogin,
  suspiciousActivity,
  passwordChangedAlert,
  emailChangedAlert,
  accountLocked,

  /* 8. Account */
  emailVerification,
  passwordReset,
  passwordChanged,

  /* 9. Admin */
  adminNewRegistration,
  adminPaymentReceived,
  adminRenewalRequest,
  adminUpgradeRequest,
  adminDailyDigest,
  adminWeeklyReport,
  adminSystemAlert,

  /* 10. Legacy aliases — safe to use during migration */
  accountActivated,
  emailVerify,
  subscriptionReceived,
  newSubscriptionAdmin,
  subscriptionRenewed,
  subscriptionExpiring,
  subscriptionExpired,
  accountSuspended,
  accountReactivated,
  paymentReceipt,
  trialEnding,
  trialEnded,
  supportTicketCreated,
  supportTicketUpdated,
  supportTicketResolved,
};