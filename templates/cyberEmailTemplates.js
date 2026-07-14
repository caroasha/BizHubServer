const env = require('../config/env');

const getBaseData = async (tenantId) => {
  let cafeName = ''; let cafeEmail = ''; let cafePhone = '';
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact').lean();
      if (tenant) { cafeName = tenant.businessName || ''; cafeEmail = tenant.contact?.email || ''; cafePhone = tenant.contact?.phone || ''; }
    } catch {}
  }
  if (!cafeName) {
    try {
      const Settings = require('../models/admin/Settings');
      const s = await Settings.find({ key: { $in: ['system_name', 'support_email', 'support_phone'] } }).lean();
      const map = {}; s.forEach(x => { map[x.key] = x.value; });
      cafeName = map.system_name || env.APP_NAME || 'DigitalManager';
      cafeEmail = map.support_email || ''; cafePhone = map.support_phone || '';
    } catch {}
  }
  if (!cafeName) cafeName = 'DigitalManager';
  return { APP_NAME: cafeName, SUPPORT_EMAIL: cafeEmail, SUPPORT_PHONE: cafePhone, CURRENT_YEAR: new Date().getFullYear() };
};

const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - ${d.APP_NAME}</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);padding:30px 40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:26px;">💻 ${d.APP_NAME}</h1></td></tr><tr><td style="background:#f8fafc;padding:16px 40px;"><h2 style="margin:0;font-size:18px;color:#1e293b;">${title}</h2></td></tr><tr><td style="padding:30px 40px;">${content}</td></tr><tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">© ${d.CURRENT_YEAR} ${d.APP_NAME}. ${d.SUPPORT_EMAIL} ${d.SUPPORT_PHONE}</p></td></tr></table></td></tr></table></body></html>`;
};

const sessionReceipt = async (data) => {
  const content = `<p>Dear ${data.name || 'Customer'},</p><p>Thank you for visiting.</p><div style="background:#f5f3ff;border-left:4px solid #8b5cf6;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;"><p style="font-weight:600;">Session #${data.sessionNo}</p><table style="width:100%;border-collapse:collapse;"><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0;color:#64748b;">Computer</td><td style="text-align:right;font-weight:600;">${data.computer}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0;color:#64748b;">Duration</td><td style="text-align:right;font-weight:600;">${data.duration}</td></tr><tr><td style="padding:8px 0;font-weight:700;">Total</td><td style="text-align:right;font-weight:700;color:#8b5cf6;">KSh ${data.amount}</td></tr></table></div>`;
  return baseLayout(content, 'Session Receipt', data.tenantId);
};

const packageExpiring = async (data) => {
  const content = `<div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;"><strong>⏰ Package Expiring</strong></div><p>Dear ${data.name},</p><p>Your <strong>${data.packageName}</strong> package expires in <strong>${data.daysLeft} days</strong>.</p>`;
  return baseLayout(content, 'Package Expiring', data.tenantId);
};

module.exports = { sessionReceipt, packageExpiring };