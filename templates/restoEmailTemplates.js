const env = require('../config/env');

// ============================================
// Get Base Data (Restaurant Info)
// ============================================
const getBaseData = async (tenantId) => {
  let restoName = '';
  let restoEmail = '';
  let restoPhone = '';
  let restoAddress = '';

  // 1. Try tenant contact first
  if (tenantId) {
    try {
      const Tenant = require('../models/admin/Tenant');
      const tenant = await Tenant.findById(tenantId).select('businessName contact address').lean();
      if (tenant) {
        restoName = tenant.businessName || '';
        restoEmail = tenant.contact?.email || '';
        restoPhone = tenant.contact?.phone || '';
        restoAddress = tenant.address || '';
      }
    } catch {}
  }

  // 2. Fallback to system settings
  if (!restoName) {
    try {
      const Settings = require('../models/admin/Settings');
      const settings = await Settings.find({
        key: { $in: ['system_name', 'support_email', 'support_phone', 'system_address'] }
      }).lean();
      const map = {};
      settings.forEach(s => { map[s.key] = s.value; });
      restoName = map.system_name || env.APP_NAME || 'RestoManagerKE';
      restoEmail = map.support_email || 'support@bizhub.co.ke';
      restoPhone = map.support_phone || '';
      restoAddress = map.system_address || '';
    } catch {}
  }

  // 3. Final fallback
  if (!restoName) restoName = 'RestoManagerKE';

  return {
    APP_NAME: restoName,
    SUPPORT_EMAIL: restoEmail,
    SUPPORT_PHONE: restoPhone,
    SUPPORT_ADDRESS: restoAddress,
    CURRENT_YEAR: new Date().getFullYear(),
    PRIMARY_COLOR: '#f97316',
    PRIMARY_LIGHT: '#fff7ed',
  };
};

// ============================================
// Base Layout - ORANGE THEME
// ============================================
const baseLayout = async (content, title, tenantId) => {
  const d = await getBaseData(tenantId);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${d.APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      padding: 32px 40px 28px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      color: #fed7aa;
      margin: 4px 0 0 0;
      font-size: 14px;
      font-weight: 500;
    }
    .header .icon {
      font-size: 42px;
      margin-bottom: 8px;
      display: block;
    }
    .header .divider {
      width: 60px;
      height: 3px;
      background: rgba(255, 255, 255, 0.4);
      margin: 10px auto 0;
      border-radius: 4px;
    }
    .content {
      padding: 32px 40px;
      background: #ffffff;
    }
    .content .greeting {
      font-size: 16px;
      color: #1e293b;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .content .message {
      font-size: 15px;
      color: #475569;
      line-height: 1.7;
      margin-bottom: 20px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer .brand {
      color: #f97316;
      font-weight: 600;
    }
    /* Utility */
    .text-center { text-align: center; }
    .mt-8 { margin-top: 8px; }
    .mt-16 { margin-top: 16px; }
    .mb-8 { margin-bottom: 8px; }
    .mb-16 { margin-bottom: 16px; }
    
    /* Boxes */
    .info-box {
      background: #fff7ed;
      border-left: 4px solid #f97316;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .success-box {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .warning-box {
      background: #fff8e1;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .danger-box {
      background: #fff1f2;
      border-left: 4px solid #e11d48;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    
    /* Tables */
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 14px;
    }
    .detail-table thead th {
      background: #f8fafc;
      text-align: left;
      padding: 10px 12px;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    .detail-table tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .detail-table .text-right { text-align: right; }
    .detail-table .text-center { text-align: center; }
    .detail-table .total-row td {
      font-weight: 700;
      border-top: 2px solid #f97316;
      padding-top: 12px;
      font-size: 16px;
    }
    .detail-table .total-row .total-amount {
      color: #f97316;
      font-size: 18px;
    }
    
    /* Buttons */
    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: #f97316;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #ea580c;
    }
    .btn-secondary {
      background: #1e293b;
    }
    .btn-secondary:hover {
      background: #0f172a;
    }
    
    /* Status badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    
    /* Order items list */
    .order-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .order-item:last-child {
      border-bottom: none;
    }
    .order-item .item-name { color: #1e293b; }
    .order-item .item-price { color: #f97316; font-weight: 600; }
    
    .order-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 0 4px;
      border-top: 2px solid #f97316;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .order-total .total-amount {
      color: #f97316;
    }
    
    .delivery-info {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 12px 0;
      font-size: 14px;
    }
    .delivery-info .label {
      color: #64748b;
      font-weight: 500;
    }
    .delivery-info .value {
      color: #1e293b;
    }
    
    @media (max-width: 480px) {
      .container { margin: 10px; border-radius: 12px; }
      .header { padding: 24px 20px; }
      .header h1 { font-size: 22px; }
      .content { padding: 24px 20px; }
      .footer { padding: 16px 20px; }
      .detail-table { font-size: 13px; }
      .detail-table thead th, .detail-table tbody td { padding: 8px 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <span class="icon">🍽️</span>
      <h1>${d.APP_NAME}</h1>
      <p class="subtitle">Restaurant Management System</p>
      <div class="divider"></div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <div class="greeting">${title}</div>
      ${content}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>© ${d.CURRENT_YEAR} <span class="brand">${d.APP_NAME}</span>. All rights reserved.</p>
      ${d.SUPPORT_EMAIL ? `<p>📧 ${d.SUPPORT_EMAIL}</p>` : ''}
      ${d.SUPPORT_PHONE ? `<p>📞 ${d.SUPPORT_PHONE}</p>` : ''}
      ${d.SUPPORT_ADDRESS ? `<p>📍 ${d.SUPPORT_ADDRESS}</p>` : ''}
      <p style="margin-top: 6px; font-size: 11px; color: #cbd5e1;">Powered by RestoManagerKE</p>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================
// ORDER CONFIRMED
// ============================================
const orderConfirmed = async (data) => {
  const { tenantId, name, orderNo, total, items, estimatedTime, orderType } = data;

  const itemsHtml = (items || []).map(item => `
    <div class="order-item">
      <span class="item-name">${item.name} × ${item.quantity}</span>
      <span class="item-price">KES ${(item.totalPrice || item.total || 0).toLocaleString()}</span>
    </div>
  `).join('');

  const content = `
    <p class="message">Dear <strong>${name || 'Customer'}</strong>,</p>
    <p class="message">Thank you for your order! We are pleased to confirm that your order has been received and is being processed.</p>
    
    <div class="success-box">
      <p style="font-weight: 600; color: #16a34a; font-size: 16px;">✅ Order Confirmed</p>
      <p style="font-size: 14px; color: #1e293b; margin-top: 4px;">
        <strong>Order #:</strong> ${orderNo}
        ${orderType ? ` • <strong>Type:</strong> ${orderType}` : ''}
      </p>
    </div>
    
    <div style="margin: 16px 0;">
      <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">📋 Order Items</p>
      ${itemsHtml}
      <div class="order-total">
        <span>Total</span>
        <span class="total-amount">KES ${(total || 0).toLocaleString()}</span>
      </div>
    </div>
    
    ${estimatedTime ? `
      <div class="info-box">
        <p style="font-weight: 600; color: #f97316;">⏱️ Estimated Preparation Time</p>
        <p style="color: #1e293b; font-size: 15px;">${estimatedTime}</p>
      </div>
    ` : ''}
    
    <p class="message" style="font-size: 14px; color: #64748b;">
      We will notify you when your order is ready. If you have any questions, please contact us.
    </p>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="#" class="btn">Track Your Order</a>
    </div>
  `;

  return baseLayout(content, `Order #${orderNo} Confirmed ✅`, tenantId);
};

// ============================================
// ORDER READY
// ============================================
const orderReady = async (data) => {
  const { tenantId, name, orderNo } = data;

  const content = `
    <p class="message">Dear <strong>${name || 'Customer'}</strong>,</p>
    
    <div class="success-box">
      <p style="font-weight: 600; color: #16a34a; font-size: 18px;">🎉 Your Order is Ready!</p>
      <p style="font-size: 14px; color: #1e293b; margin-top: 4px;">
        <strong>Order #:</strong> ${orderNo}
      </p>
    </div>
    
    <p class="message">Your order is now ready for pickup. Please come to the restaurant to collect your order.</p>
    
    <div class="info-box">
      <p style="font-weight: 600; color: #f97316;">📍 Pickup Information</p>
      <p style="color: #1e293b;">Please bring your order number for verification.</p>
    </div>
    
    <p class="message" style="font-size: 14px; color: #64748b;">
      Thank you for choosing us. We hope you enjoy your meal!
    </p>
  `;

  return baseLayout(content, `Order #${orderNo} Ready 🎉`, tenantId);
};

// ============================================
// SALE INVOICE / RECEIPT
// ============================================
const saleInvoice = async (data) => {
  const { tenantId, sale } = data;
  const isPaid = sale.paymentStatus === 'paid' || sale.paymentStatus === 'Paid';
  const receiptNumber = sale.receiptNumber || sale.transactionId || sale.orderNumber || 'N/A';

  const itemsHtml = (sale.items || []).map(item => `
    <tr>
      <td>${item.name || item.menuItemName || 'Item'}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">KES ${(item.unitPrice || item.price || 0).toLocaleString()}</td>
      <td class="text-right">KES ${(item.totalPrice || item.total || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const content = `
    <p class="message">Dear <strong>${sale.customerName || 'Customer'}</strong>,</p>
    <p class="message">${isPaid ? 'Thank you for your payment. Here is your receipt.' : 'Please find your invoice below.'}</p>
    
    <div class="${isPaid ? 'success-box' : 'info-box'}">
      <p style="font-weight: 600; color: ${isPaid ? '#16a34a' : '#f97316'}; font-size: 16px;">
        ${isPaid ? '🧾 Receipt' : '📋 Invoice'} #${receiptNumber}
      </p>
      <p style="font-size: 13px; color: #64748b; margin-top: 2px;">
        Date: ${new Date(sale.createdAt).toLocaleDateString('en-KE', { 
          day: 'numeric', month: 'long', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        })}
      </p>
      ${sale.paymentMethod ? `<p style="font-size: 13px; color: #64748b;">Payment: ${sale.paymentMethod}</p>` : ''}
    </div>
    
    <table class="detail-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No items</td></tr>'}
        ${sale.discount > 0 ? `
          <tr>
            <td colspan="3" style="text-align: right; color: #e11d48; font-weight: 600;">Discount</td>
            <td class="text-right" style="color: #e11d48;">-KES ${(sale.discount || 0).toLocaleString()}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">${isPaid ? 'Total Paid' : 'Amount Due'}</td>
          <td class="text-right total-amount">KES ${(sale.totalAmount || 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    
    ${!isPaid ? `
      <div class="warning-box">
        <p style="font-weight: 600; color: #92400e;">⏳ Pending Payment</p>
        <p style="font-size: 14px; color: #1e293b;">Please complete payment to confirm your order.</p>
      </div>
    ` : `
      <div class="success-box" style="text-align: center;">
        <p style="font-weight: 600; color: #16a34a;">✅ Payment Successful</p>
        <p style="font-size: 14px; color: #1e293b;">Thank you for your payment!</p>
      </div>
    `}
    
    <p class="message" style="font-size: 14px; color: #64748b; text-align: center;">
      For any inquiries, please contact us.
    </p>
  `;

  return baseLayout(content, isPaid ? 'Payment Receipt' : 'Invoice', tenantId);
};

// ============================================
// TABLE BOOKING
// ============================================
const tableBooking = async (data) => {
  const { tenantId, name, date, time, guests, tableNumber, requests } = data;

  const content = `
    <p class="message">Dear <strong>${name || 'Customer'}</strong>,</p>
    
    <div class="success-box">
      <p style="font-weight: 600; color: #16a34a; font-size: 16px;">📅 Table Booking Confirmed</p>
      <p style="font-size: 14px; color: #1e293b; margin-top: 4px;">
        Your table has been successfully booked.
      </p>
    </div>
    
    <div class="info-box">
      <p style="font-weight: 600; color: #f97316;">📍 Booking Details</p>
      <p style="color: #1e293b; margin: 4px 0;">
        <strong>Date:</strong> ${date || 'N/A'}
      </p>
      <p style="color: #1e293b; margin: 4px 0;">
        <strong>Time:</strong> ${time || 'N/A'}
      </p>
      <p style="color: #1e293b; margin: 4px 0;">
        <strong>Guests:</strong> ${guests || 0}
      </p>
      ${tableNumber ? `
        <p style="color: #1e293b; margin: 4px 0;">
          <strong>Table:</strong> ${tableNumber}
        </p>
      ` : ''}
    </div>
    
    ${requests ? `
      <div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
        <p style="font-weight: 600; color: #1e293b; font-size: 14px;">📝 Special Requests</p>
        <p style="color: #475569; font-size: 14px;">${requests}</p>
      </div>
    ` : ''}
    
    <p class="message" style="font-size: 14px; color: #64748b;">
      We look forward to welcoming you! Please arrive on time for your reservation.
    </p>
  `;

  return baseLayout(content, 'Table Booking Confirmed 📅', tenantId);
};

// ============================================
// LOW STOCK ALERT
// ============================================
const lowStockAlert = async (data) => {
  const { tenantId, businessName, items } = data;

  const itemsHtml = (items || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td class="text-center" style="color: #e11d48; font-weight: 600;">${item.stock}</td>
      <td class="text-center">${item.minStockAlert || 5}</td>
    </tr>
  `).join('');

  const content = `
    <div class="danger-box">
      <p style="font-weight: 600; color: #991b1b; font-size: 16px;">⚠️ Low Stock Alert</p>
      <p style="font-size: 14px; color: #1e293b;">
        The following items are running low on stock at <strong>${businessName || 'your restaurant'}</strong>.
      </p>
    </div>
    
    <table class="detail-table">
      <thead>
        <tr>
          <th>Item Name</th>
          <th class="text-center">Current Stock</th>
          <th class="text-center">Min. Alert Level</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No items</td></tr>'}
      </tbody>
    </table>
    
    <div class="warning-box">
      <p style="font-weight: 600; color: #92400e;">📦 Action Required</p>
      <p style="font-size: 14px; color: #1e293b;">
        Please review your stock and reorder these items as soon as possible.
      </p>
    </div>
  `;

  return baseLayout(content, 'Low Stock Alert ⚠️', tenantId);
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================
module.exports = {
  orderConfirmed,
  orderReady,
  saleInvoice,
  tableBooking,
  lowStockAlert,
};