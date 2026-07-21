const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const aiService = require('../../services/aiService');
const Medicine = require('../../models/pharma/Medicine');
const Sale = require('../../models/pharma/Sale');
const Prescription = require('../../models/pharma/Prescription');
const PurchaseOrder = require('../../models/pharma/PurchaseOrder');
const Account = require('../../models/pharma/Account');
const Supplier = require('../../models/pharma/Supplier');
const MedicineCategory = require('../../models/pharma/MedicineCategory');

const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const tenantId = req.tenant._id;
  const businessName = req.tenant?.businessName || 'Pharmacy';

  // Gather all pharmacy data for context
  const [
    medicines, categories, sales, prescriptions, purchaseOrders,
    accounts, suppliers, lowStock, expiring, todaySales, monthRevenue,
  ] = await Promise.all([
    Medicine.find({ tenantId, isActive: true }).select('name genericName dosage stock buyingPrice sellingPrice batchNo expiryDate minStockAlert categoryId').populate('categoryId', 'name').lean(),
    MedicineCategory.find({ tenantId, isActive: true }).select('name').lean(),
    Sale.find({ tenantId, paymentStatus: 'paid' }).sort({ createdAt: -1 }).limit(20).select('receiptNumber customerName totalAmount paymentMethod createdAt').lean(),
    Prescription.find({ tenantId, status: { $in: ['pending', 'processing'] } }).select('customerName doctorName items status createdAt').lean(),
    PurchaseOrder.find({ tenantId, status: { $in: ['draft', 'ordered'] } }).populate('supplierId', 'name').select('orderNumber supplierId items totalAmount status expectedDelivery').lean(),
    Account.find({ tenantId }).sort({ date: -1 }).limit(10).select('type category amount description date').lean(),
    Supplier.find({ tenantId, isActive: true }).select('name company phone email').lean(),
    Medicine.countDocuments({ tenantId, isActive: true, $expr: { $lte: ['$stock', '$minStockAlert'] } }),
    Medicine.find({ tenantId, isActive: true, expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }).select('name stock expiryDate').lean(),
    Sale.countDocuments({ tenantId, createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }, paymentStatus: 'paid' }),
    Sale.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);

  // Build comprehensive context
  const context = {
    businessName,
    totalMedicines: medicines.length,
    lowStockCount: lowStock,
    expiringCount: expiring.length,
    todaySalesCount: todaySales,
    monthRevenue: monthRevenue[0]?.total || 0,
    categories: categories.map(c => c.name),
    lowStockItems: medicines.filter(m => m.stock <= m.minStockAlert).map(m => ({
      name: m.name, stock: m.stock, minStockAlert: m.minStockAlert,
      buyingPrice: m.buyingPrice, sellingPrice: m.sellingPrice,
    })),
    expiringItems: expiring.map(m => ({
      name: m.name, stock: m.stock, expiryDate: m.expiryDate?.toISOString().split('T')[0],
    })),
    recentSales: sales.map(s => ({
      receipt: s.receiptNumber, customer: s.customerName,
      amount: s.totalAmount, method: s.paymentMethod,
      date: s.createdAt?.toISOString().split('T')[0],
    })),
    pendingPrescriptions: prescriptions.map(p => ({
      customer: p.customerName, doctor: p.doctorName,
      items: p.items?.length, status: p.status,
    })),
    pendingOrders: purchaseOrders.map(o => ({
      orderNumber: o.orderNumber, supplier: o.supplierId?.name,
      items: o.items?.length, total: o.totalAmount, status: o.status,
      expectedDelivery: o.expectedDelivery?.toISOString().split('T')[0],
    })),
    recentAccounts: accounts.map(a => ({
      type: a.type, category: a.category, amount: a.amount,
      description: a.description, date: a.date?.toISOString().split('T')[0],
    })),
    suppliers: suppliers.map(s => ({ name: s.name, company: s.company, phone: s.phone, email: s.email })),
    inventorySummary: medicines.slice(0, 30).map(m => ({
      name: m.name, stock: m.stock, sellingPrice: m.sellingPrice,
      buyingPrice: m.buyingPrice, category: m.categoryId?.name,
      expiryDate: m.expiryDate?.toISOString().split('T')[0],
    })),
  };

  const result = await aiService.clientChat({
    businessType: 'pharmacy',
    businessName,
    message,
    context: JSON.stringify(context, null, 2),
  });

  sendSuccess(res, result);
});

module.exports = { chat };