const env = require('../config/env');

const getBaseData = async (tenantId) => {
  let companyName = ''; let companyEmail = ''; let companyPhone = '';
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact').lean();
      if (tenant) { companyName = tenant.businessName || ''; companyEmail = tenant.contact?.email || ''; companyPhone = tenant.contact?.phone || ''; }
    } catch {}
  }
  if (!companyName) {
    try {
      const Settings = require('../models/admin/Settings');
      const s = await Settings.find({ key: { $in: ['system_name', 'support_email', 'support_phone'] } }).lean();
      const map = {}; s.forEach(x => { map[x.key] = x.value; });
      companyName = map.system_name || env.APP_NAME || 'MyApartment';
      companyEmail = map.support_email || ''; companyPhone = map.support_phone || '';
    } catch {}
  }
  if (!companyName) companyName = 'MyApartment';
  return { APP_NAME: companyName, SUPPORT_EMAIL: companyEmail, SUPPORT_PHONE: companyPhone, CURRENT_YEAR: new Date().getFullYear() };
};

const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - ${d.APP_NAME}</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:30px 40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:26px;">🏢 ${d.APP_NAME}</h1></td></tr><tr><td style="background:#f8fafc;padding:16px 40px;"><h2 style="margin:0;font-size:18px;color:#1e293b;">${title}</h2></td></tr><tr><td style="padding:30px 40px;">${content}</td></tr><tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">© ${d.CURRENT_YEAR} ${d.APP_NAME}. ${d.SUPPORT_EMAIL} ${d.SUPPORT_PHONE}</p></td></tr></table></td></tr></table></body></html>`;
};

const styles = {
  infoBox: `background:#eff6ff;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  warningBox: `background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  dangerBox: `background:#fff1f2;border-left:4px solid #e11d48;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  detailTable: `width:100%;border-collapse:collapse;margin:16px 0;`,
  detailRow: `border-bottom:1px solid #e2e8f0;`,
  detailLabel: `padding:8px 0;font-size:13px;color:#64748b;`,
  detailValue: `padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;`,
};

const rentReminder = async (data) => {
  const content = `<p style="font-size:15px;color:#475569;">Dear ${data.name},</p><p>Rent for <strong>${data.unitNumber}</strong> (KSh ${data.amount}) is due in <strong style="color:#f59e0b;">${data.daysLeft} days</strong> on ${data.dueDate}.</p><div style="${styles.infoBox}"><table style="${styles.detailTable}"><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Property</td><td style="${styles.detailValue}">${data.businessName}</td></tr><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Unit</td><td style="${styles.detailValue}">${data.unitNumber}</td></tr><tr><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue};font-weight:700;">KSh ${data.amount}</td></tr></table></div>`;
  return baseLayout(content, 'Rent Reminder', data.tenantId);
};

const rentOverdue = async (data) => {
  const content = `<div style="${styles.dangerBox}"><strong>⚠️ Rent Overdue</strong></div><p>Dear ${data.name},</p><p>Rent for <strong>${data.unitNumber}</strong> is <span style="color:#e11d48;font-weight:600;">${data.daysOverdue} days overdue</span>. Amount: <strong>KSh ${data.amount}</strong></p>`;
  return baseLayout(content, 'Rent Overdue', data.tenantId);
};

const rentReceipt = async (data) => {
  const content = `<p>Dear ${data.name},</p><p>Payment received.</p><div style="${styles.infoBox}"><table style="${styles.detailTable}"><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Receipt</td><td style="${styles.detailValue}">${data.receiptNo}</td></tr><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Unit</td><td style="${styles.detailValue}">${data.unitNumber}</td></tr><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Amount</td><td style="${styles.detailValue};color:#16a34a;">KSh ${data.amount}</td></tr><tr><td style="${styles.detailLabel}">Month</td><td style="${styles.detailValue}">${data.month}</td></tr></table></div>`;
  return baseLayout(content, 'Rent Receipt', data.tenantId);
};

const leaseExpiring = async (data) => {
  const content = `<div style="${styles.warningBox}"><strong>⏰ Lease Expiring</strong></div><p>Dear ${data.name},</p><p>Lease for <strong>${data.unitNumber}</strong> expires in <strong>${data.daysLeft} days</strong> on ${data.expiryDate}.</p>`;
  return baseLayout(content, 'Lease Expiring', data.tenantId);
};

const maintenanceUpdate = async (data) => {
  const content = `<p>Dear ${data.name},</p><p>Maintenance update for <strong>${data.unitNumber}</strong>:</p><div style="${styles.infoBox}"><table style="${styles.detailTable}"><tr style="${styles.detailRow}"><td style="${styles.detailLabel}">Issue</td><td style="${styles.detailValue}">${data.issue}</td></tr><tr><td style="${styles.detailLabel}">Status</td><td style="${styles.detailValue}"><strong>${data.status}</strong></td></tr></table></div>`;
  return baseLayout(content, 'Maintenance Update', data.tenantId);
};

module.exports = { rentReminder, rentOverdue, rentReceipt, leaseExpiring, maintenanceUpdate };