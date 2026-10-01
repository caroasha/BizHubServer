const env = require('../config/env');

const getBaseData = async (tenantId) => {
  let shopName = ''; let shopEmail = ''; let shopPhone = '';
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact').lean();
      if (tenant) { shopName = tenant.businessName || ''; shopEmail = tenant.contact?.email || ''; shopPhone = tenant.contact?.phone || ''; }
    } catch {}
  }
  if (!shopName) {
    try {
      const Settings = require('../models/admin/Settings');
      const s = await Settings.find({ key: { $in: ['system_name', 'support_email', 'support_phone'] } }).lean();
      const map = {}; s.forEach(x => { map[x.key] = x.value; });
      shopName = map.system_name || env.APP_NAME || 'ElectroStore';
      shopEmail = map.support_email || ''; shopPhone = map.support_phone || '';
    } catch {}
  }
  if (!shopName) shopName = 'ElectroStore';
  return { APP_NAME: shopName, SUPPORT_EMAIL: shopEmail, SUPPORT_PHONE: shopPhone, CURRENT_YEAR: new Date().getFullYear() };
};

const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - ${d.APP_NAME}</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px 40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:26px;">🔌 ${d.APP_NAME}</h1></td></tr><tr><td style="background:#f8fafc;padding:16px 40px;"><h2 style="margin:0;font-size:18px;color:#1e293b;">${title}</h2></td></tr><tr><td style="padding:30px 40px;">${content}</td></tr><tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">© ${d.CURRENT_YEAR} ${d.APP_NAME}. ${d.SUPPORT_EMAIL} ${d.SUPPORT_PHONE}</p></td></tr></table></td></tr></table></body></html>`;
};

const styles = {
  infoBox: `background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  successBox: `background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  warningBox: `background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  detailTable: `width:100%;border-collapse:collapse;margin:16px 0;`,
  detailRow: `border-bottom:1px solid #e2e8f0;`,
  detailLabel: `padding:8px 0;font-size:13px;color:#64748b;`,
  detailValue: `padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;`,
};

const saleInvoice = async (data) => {
  const { sale } = data;
  const isPaid = sale.paymentStatus === 'paid';
  const itemsHtml = (sale.items || []).map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.productName}</td><td style="text-align:center;padding:8px 0;">${i.quantity}</td><td style="text-align:right;padding:8px 0;">KSh ${i.unitPrice.toLocaleString()}</td><td style="text-align:right;padding:8px 0;font-weight:600;">KSh ${i.totalPrice.toLocaleString()}</td></tr>`).join('');
  const content = `<p>Dear ${sale.customerName || 'Customer'},</p><p>${isPaid ? 'Thank you for your payment.' : 'Please find your invoice below.'}</p><div style="${isPaid ? styles.successBox : styles.infoBox}"><p style="font-weight:600;">${isPaid ? '🧾 Receipt' : '📋 Invoice'} #${sale.receiptNumber}</p><p style="font-size:13px;">Date: ${new Date(sale.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p><table style="${styles.detailTable}"><thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 0;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>${sale.discount > 0 ? `<p style="color:#e11d48;">Discount: -KSh ${sale.discount.toLocaleString()}</p>` : ''}<p style="font-weight:700;font-size:16px;border-top:2px solid #e2e8f0;padding-top:8px;">${isPaid ? 'Total Paid' : 'Amount Due'}: KSh ${sale.totalAmount.toLocaleString()}</p></div>`;
  return baseLayout(content, isPaid ? 'Receipt' : 'Invoice', data.tenantId);
};

const repairCompleted = async (data) => {
  const content = `<div style="${styles.successBox}"><strong>🔧 Repair Completed</strong></div><p>Dear ${data.customerName},</p><p>Your <strong>${data.device}</strong> is ready for pickup. Repair #${data.repairNumber} | Cost: KSh ${data.cost}</p>`;
  return baseLayout(content, 'Repair Completed', data.tenantId);
};

const warrantyExpiring = async (data) => {
  const content = `<div style="${styles.warningBox}"><strong>⏰ Warranty Expiring</strong></div><p>Warranty for <strong>${data.product}</strong> expires in <strong>${data.daysLeft} days</strong> (${data.expiryDate}).</p>`;
  return baseLayout(content, 'Warranty Expiring', data.tenantId);
};

module.exports = { saleInvoice, repairCompleted, warrantyExpiring };