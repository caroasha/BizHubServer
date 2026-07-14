const env = require('../config/env');

const getBaseData = async (tenantId) => {
  let restoName = ''; let restoEmail = ''; let restoPhone = '';
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact').lean();
      if (tenant) { restoName = tenant.businessName || ''; restoEmail = tenant.contact?.email || ''; restoPhone = tenant.contact?.phone || ''; }
    } catch {}
  }
  if (!restoName) {
    try {
      const Settings = require('../models/admin/Settings');
      const s = await Settings.find({ key: { $in: ['system_name', 'support_email', 'support_phone'] } }).lean();
      const map = {}; s.forEach(x => { map[x.key] = x.value; });
      restoName = map.system_name || env.APP_NAME || 'RestoManagerKE';
      restoEmail = map.support_email || ''; restoPhone = map.support_phone || '';
    } catch {}
  }
  if (!restoName) restoName = 'RestoManagerKE';
  return { APP_NAME: restoName, SUPPORT_EMAIL: restoEmail, SUPPORT_PHONE: restoPhone, CURRENT_YEAR: new Date().getFullYear() };
};

const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - ${d.APP_NAME}</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:30px 40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:26px;">🍽️ ${d.APP_NAME}</h1></td></tr><tr><td style="background:#f8fafc;padding:16px 40px;"><h2 style="margin:0;font-size:18px;color:#1e293b;">${title}</h2></td></tr><tr><td style="padding:30px 40px;">${content}</td></tr><tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">© ${d.CURRENT_YEAR} ${d.APP_NAME}. ${d.SUPPORT_EMAIL} ${d.SUPPORT_PHONE}</p></td></tr></table></td></tr></table></body></html>`;
};

const styles = {
  infoBox: `background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  successBox: `background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  detailTable: `width:100%;border-collapse:collapse;margin:16px 0;`,
  detailRow: `border-bottom:1px solid #e2e8f0;`,
  detailLabel: `padding:8px 0;font-size:13px;color:#64748b;`,
  detailValue: `padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;`,
};

const orderConfirmed = async (data) => {
  const itemsHtml = (data.items || []).map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.name} x${i.quantity}</td><td style="${styles.detailValue}">KSh ${i.total.toLocaleString()}</td></tr>`).join('');
  const content = `<p>Dear ${data.name || 'Customer'},</p><p>Your order at <strong>${data.businessName}</strong> has been confirmed!</p><div style="${styles.successBox}"><p style="font-weight:600;">🛒 Order #${data.orderNo}</p><table style="${styles.detailTable}">${itemsHtml}<tr><td style="${styles.detailLabel};font-weight:700;">Total</td><td style="${styles.detailValue};font-weight:700;">KSh ${data.total.toLocaleString()}</td></tr></table>${data.estimatedTime ? `<p style="font-size:13px;">⏱️ Estimated: ${data.estimatedTime}</p>` : ''}</div>`;
  return baseLayout(content, `Order #${data.orderNo} Confirmed`, data.tenantId);
};

const orderReady = async (data) => {
  const content = `<div style="${styles.successBox}"><strong>🎉 Your order is ready!</strong></div><p>Dear ${data.name},</p><p>Order <strong>#${data.orderNo}</strong> from <strong>${data.businessName}</strong> is ready for pickup.</p>`;
  return baseLayout(content, `Order #${data.orderNo} Ready`, data.tenantId);
};

const saleInvoice = async (data) => {
  const { sale } = data;
  const isPaid = sale.paymentStatus === 'paid';
  const itemsHtml = (sale.items || []).map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.name || i.menuItemName}${i.dosage ? ' · ' + i.dosage : ''}</td><td style="text-align:center;padding:8px 0;">${i.quantity}</td><td style="text-align:right;padding:8px 0;">KSh ${(i.unitPrice || i.price || 0).toLocaleString()}</td><td style="text-align:right;padding:8px 0;font-weight:600;">KSh ${(i.totalPrice || i.total || 0).toLocaleString()}</td></tr>`).join('');
  const content = `<p>Dear ${sale.customerName || 'Customer'},</p><p>${isPaid ? 'Thank you for your payment.' : 'Please find your invoice below.'}</p><div style="${isPaid ? styles.successBox : styles.infoBox}"><p style="font-weight:600;">${isPaid ? '🧾 Receipt' : '📋 Invoice'} #${sale.receiptNumber || sale.orderNumber}</p><p style="font-size:13px;">Date: ${new Date(sale.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p><table style="${styles.detailTable}"><thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 0;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>${sale.discount > 0 ? `<p style="color:#e11d48;">Discount: -KSh ${sale.discount.toLocaleString()}</p>` : ''}<p style="font-weight:700;font-size:16px;border-top:2px solid #e2e8f0;padding-top:8px;">${isPaid ? 'Total Paid' : 'Amount Due'}: KSh ${(sale.totalAmount || 0).toLocaleString()}</p></div>`;
  return baseLayout(content, isPaid ? 'Receipt' : 'Invoice', data.tenantId);
};

const tableBooking = async (data) => {
  const content = `<div style="${styles.infoBox}"><strong>📅 Table Booking Confirmed</strong></div><p>Dear ${data.name},</p><p>Your table <strong>${data.tableNumber}</strong> has been booked at <strong>${data.businessName}</strong> for ${data.date} at ${data.time}. Guests: ${data.guests}.</p>`;
  return baseLayout(content, 'Table Booking', data.tenantId);
};

const lowStockAlert = async (data) => {
  const itemsHtml = (data.items || []).map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.name}</td><td style="${styles.detailValue};color:#e11d48;">${i.stock} left</td></tr>`).join('');
  const content = `<div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;"><strong>⚠️ Low Stock Alert</strong></div><p>Low stock at <strong>${data.businessName}</strong>:</p><table style="${styles.detailTable}">${itemsHtml}</table>`;
  return baseLayout(content, 'Low Stock Alert', data.tenantId);
};

module.exports = { orderConfirmed, orderReady, saleInvoice, tableBooking, lowStockAlert };