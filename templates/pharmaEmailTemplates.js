const env = require('../config/env');

const getBaseData = async (tenantId) => {
  let pharmacyName = '';
  let pharmacyEmail = '';
  let pharmacyPhone = '';

  // 1. Try tenant contact first
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact').lean();
      if (tenant) {
        pharmacyName = tenant.businessName || '';
        pharmacyEmail = tenant.contact?.email || '';
        pharmacyPhone = tenant.contact?.phone || '';
      }
    } catch {}
  }

  // 2. Fallback to system settings
  if (!pharmacyName || !pharmacyEmail) {
    try {
      const Settings = require('../models/admin/Settings');
      const settings = await Settings.find({
        key: { $in: ['system_name', 'support_email', 'support_phone'] }
      }).lean();
      const map = {};
      settings.forEach(s => { map[s.key] = s.value; });
      if (!pharmacyName) pharmacyName = map.system_name || env.APP_NAME || 'PharmaSys';
      if (!pharmacyEmail) pharmacyEmail = map.support_email || 'support@bizhub.co.ke';
      if (!pharmacyPhone) pharmacyPhone = map.support_phone || '';
    } catch {}
  }

  // 3. Final fallback
  if (!pharmacyName) pharmacyName = 'PharmaSys';

  return {
    APP_NAME: pharmacyName,
    SUPPORT_EMAIL: pharmacyEmail,
    SUPPORT_PHONE: pharmacyPhone,
    CURRENT_YEAR: new Date().getFullYear(),
  };
};

const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} - ${d.APP_NAME}</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#059669,#047857);padding:30px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">💊 ${d.APP_NAME}</h1>
<p style="color:#a7f3d0;margin:8px 0 0;font-size:14px;">Pharmacy Management System</p>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:16px 40px;border-bottom:1px solid #e2e8f0;">
<h2 style="margin:0;font-size:18px;color:#1e293b;font-weight:600;">${title}</h2>
</td></tr>
<tr><td style="padding:30px 40px;">{{content}}</td></tr>
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
  button: (color = '#059669') => `display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;text-align:center;`,
  infoBox: `background-color:#f0fdf4;border-left:4px solid #059669;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  warningBox: `background-color:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  dangerBox: `background-color:#fff1f2;border-left:4px solid #e11d48;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
  detailTable: `width:100%;border-collapse:collapse;margin:16px 0;`,
  detailRow: `border-bottom:1px solid #e2e8f0;`,
  detailLabel: `padding:8px 0;font-size:13px;color:#64748b;`,
  detailValue: `padding:8px 0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;`,
};

const saleInvoice = async (data) => {
  const { tenantId, sale, isPending } = data;
  const isPaid = sale.paymentStatus === 'paid';
  
  const itemsHtml = (sale.items || []).map(item => `
    <tr style="${styles.detailRow}">
      <td style="${styles.detailLabel}">${item.medicineName || item.name} ${item.dosage || ''}</td>
      <td style="text-align:center;padding:8px 0;font-size:13px;">${item.quantity}</td>
      <td style="text-align:right;padding:8px 0;font-size:13px;">KSh ${(item.unitPrice || item.sellingPrice || 0).toLocaleString()}</td>
      <td style="text-align:right;padding:8px 0;font-size:13px;font-weight:600;">KSh ${((item.totalPrice || item.total) || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const title = isPaid ? 'Payment Receipt' : 'Invoice';
  const message = isPaid 
    ? `Thank you for your payment. Here is your receipt.`
    : `Please find your invoice below. Kindly make payment at your earliest convenience.`;
  const statusLine = isPaid
    ? `<tr><td style="color:#64748b;">Status:</td><td style="text-align:right;color:#16a34a;font-weight:600;">✅ Paid</td></tr>`
    : `<tr><td style="color:#64748b;">Status:</td><td style="text-align:right;color:#f59e0b;font-weight:600;">⏳ Pending Payment</td></tr>`;

  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Dear ${sale.customerName || 'Customer'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">${message}</p>

    <div style="${isPaid ? styles.successBox : styles.infoBox}">
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;">${isPaid ? '🧾' : '📋'} ${title} #${sale.receiptNumber}</p>
      <table style="width:100%;font-size:13px;margin-bottom:12px;">
        <tr><td style="color:#64748b;">Date:</td><td style="text-align:right;">${new Date(sale.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
        <tr><td style="color:#64748b;">Payment Method:</td><td style="text-align:right;text-transform:capitalize;">${sale.paymentMethod}</td></tr>
        ${sale.customerPhone ? `<tr><td style="color:#64748b;">Phone:</td><td style="text-align:right;">${sale.customerPhone}</td></tr>` : ''}
        ${statusLine}
      </table>

      <table style="${styles.detailTable}">
        <thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 0;font-size:12px;color:#64748b;">Item</th><th style="text-align:center;padding:8px 0;font-size:12px;color:#64748b;">Qty</th><th style="text-align:right;padding:8px 0;font-size:12px;color:#64748b;">Price</th><th style="text-align:right;padding:8px 0;font-size:12px;color:#64748b;">Total</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <table style="width:100%;margin-top:12px;">
        ${sale.discount > 0 ? `<tr><td style="color:#64748b;padding:4px 0;">Subtotal</td><td style="text-align:right;">KSh ${(sale.subtotal || 0).toLocaleString()}</td></tr>
        <tr><td style="color:#e11d48;padding:4px 0;">Discount</td><td style="text-align:right;color:#e11d48;">- KSh ${(sale.discount || 0).toLocaleString()}</td></tr>` : ''}
        <tr style="border-top:2px solid #e2e8f0;"><td style="font-weight:700;padding:8px 0;font-size:16px;">${isPaid ? 'Total Paid' : 'Amount Due'}</td><td style="text-align:right;font-weight:700;font-size:16px;color:${isPaid ? '#16a34a' : '#f59e0b'};">KSh ${(sale.totalAmount || 0).toLocaleString()}</td></tr>
      </table>
    </div>

    ${!isPaid ? `<p style="font-size:14px;color:#64748b;margin-top:16px;">Please make payment to complete this invoice. Contact us if you have any questions.</p>` : `<p style="font-size:13px;color:#64748b;margin-top:16px;">Thank you for your payment. For any inquiries, please contact us.</p>`}
  `;

  const layout = await baseLayout('', title, tenantId);
  return layout.replace('{{content}}', content);
};

// ---- PRESCRIPTION READY ----
const prescriptionReady = async (data) => {
  const content = `
    <div style="${styles.infoBox}"><p style="margin:0;font-size:14px;color:#166534;"><strong>💊 Prescription Ready</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Dear ${data.customerName},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">Your prescription is ready for pickup.</p>
    ${data.items?.length > 0 ? `
    <table style="${styles.detailTable}">
      ${data.items.map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.medicineName}</td><td style="${styles.detailValue}">${i.quantity} x ${i.dosage}</td></tr>`).join('')}
      <tr><td style="${styles.detailLabel};font-weight:700;">Total</td><td style="${styles.detailValue};font-weight:700;">KSh ${(data.totalAmount || 0).toLocaleString()}</td></tr>
    </table>` : ''}
  `;
  return baseLayout(content, 'Prescription Ready', data.tenantId);
};

// ---- EXPIRY ALERT ----
const expiryAlert = async (data) => {
  const content = `
    <div style="${data.daysUntilExpiry <= 7 ? styles.dangerBox : styles.warningBox}">
      <p style="margin:0;font-size:14px;color:${data.daysUntilExpiry <= 7 ? '#9f1239' : '#92400e'};"><strong>⏰ Expiry Alert</strong></p>
    </div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">The following medicines are expiring soon:</p>
    <table style="${styles.detailTable}">
      ${data.items?.map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.name} ${i.batchNo ? '(' + i.batchNo + ')' : ''}</td><td style="${styles.detailValue};color:#e11d48;">${i.expiryDate}</td></tr>`).join('') || ''}
    </table>
  `;
  return baseLayout(content, 'Expiry Alert', data.tenantId);
};

// ---- LOW STOCK ALERT ----
const lowStockAlert = async (data) => {
  const content = `
    <div style="${styles.warningBox}"><p style="margin:0;font-size:14px;color:#92400e;"><strong>⚠️ Low Stock Alert</strong></p></div>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:16px 0;">Low stock items:</p>
    <table style="${styles.detailTable}">
      ${data.items?.map(i => `<tr style="${styles.detailRow}"><td style="${styles.detailLabel}">${i.name}</td><td style="${styles.detailValue};color:#e11d48;">${i.stock} left (min: ${i.minStockAlert})</td></tr>`).join('') || ''}
    </table>
  `;
  return baseLayout(content, 'Low Stock Alert', data.tenantId);
};

// ---- PURCHASE ORDER ----
const purchaseOrder = async (data) => {
  const { order, supplier, businessName } = data;
  const itemsHtml = (order.items || []).map(item => `
    <tr style="${styles.detailRow}">
      <td style="${styles.detailLabel}">${item.medicineName}</td>
      <td style="text-align:center;padding:8px 0;font-size:13px;">${item.quantity}</td>
      <td style="text-align:right;padding:8px 0;font-size:13px;">KSh ${(item.unitPrice || 0).toLocaleString()}</td>
      <td style="text-align:right;padding:8px 0;font-size:13px;font-weight:600;">KSh ${(item.totalPrice || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const content = `
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Dear ${supplier?.name || 'Supplier'},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Please find our purchase order below.</p>

    <div style="${styles.infoBox}">
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;">📋 Purchase Order #${order.orderNumber}</p>
      <table style="width:100%;font-size:13px;margin-bottom:12px;">
        <tr><td style="color:#64748b;">Date:</td><td style="text-align:right;">${new Date(order.orderDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td style="color:#64748b;">From:</td><td style="text-align:right;font-weight:600;">${businessName}</td></tr>
        ${order.expectedDelivery ? `<tr><td style="color:#64748b;">Expected:</td><td style="text-align:right;">${new Date(order.expectedDelivery).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>` : ''}
      </table>

      <table style="${styles.detailTable}">
        <thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 0;font-size:12px;color:#64748b;">Item</th><th style="text-align:center;padding:8px 0;font-size:12px;color:#64748b;">Qty</th><th style="text-align:right;padding:8px 0;font-size:12px;color:#64748b;">Price</th><th style="text-align:right;padding:8px 0;font-size:12px;color:#64748b;">Total</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <table style="width:100%;margin-top:12px;">
        <tr style="border-top:2px solid #e2e8f0;"><td style="font-weight:700;padding:8px 0;font-size:16px;">Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#059669;">KSh ${(order.totalAmount || 0).toLocaleString()}</td></tr>
      </table>
    </div>

    ${order.notes ? `<p style="font-size:13px;color:#64748b;margin-top:16px;"><strong>Notes:</strong> ${order.notes}</p>` : ''}
    <p style="font-size:13px;color:#64748b;margin-top:16px;">Please confirm receipt of this order and expected delivery date.</p>
  `;

  const layout = await baseLayout('', `Purchase Order #${order.orderNumber}`, data.tenantId);
  return layout.replace('{{content}}', content);
};


module.exports = { saleInvoice, prescriptionReady, expiryAlert, lowStockAlert,purchaseOrder  };