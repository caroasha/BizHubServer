const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Basic Info
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Meat', 'Vegetables', 'Dairy', 'Beverages', 'Dry Goods', 'Spices', 'Seafood', 'Grains', 'Fruits', 'Other'],
    default: 'Other',
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  
  // Stock Management
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'L', 'ml', 'pcs', 'boxes', 'bottles', 'cans', 'bags', 'packets'],
    default: 'kg',
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  minStockAlert: {
    type: Number,
    default: 5,
    min: 0,
  },
  maxStockAlert: {
    type: Number,
    default: null,
    min: 0,
  },
  
  // Pricing
  costPerUnit: {
    type: Number,
    default: 0,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Supplier Info
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoSupplier',
    default: null,
  },
  supplierName: {
    type: String,
    trim: true,
    default: null,
  },
  
  // Tracking
  batchNo: {
    type: String,
    trim: true,
    default: null,
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  barcode: {
    type: String,
    trim: true,
    default: null,
  },
  
  // Status
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'],
    default: 'In Stock',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
  
}, {
  timestamps: true,
});

// ============================================
// Indexes
// ============================================
ingredientSchema.index({ tenantId: 1, name: 1 });
ingredientSchema.index({ tenantId: 1, category: 1 });
ingredientSchema.index({ tenantId: 1, status: 1 });
ingredientSchema.index({ tenantId: 1, stock: 1 });
ingredientSchema.index({ tenantId: 1, expiryDate: 1 });
ingredientSchema.index({ tenantId: 1, supplierId: 1 });
ingredientSchema.index({ barcode: 1 });

// ============================================
// Pre-save Middleware
// ============================================
ingredientSchema.pre('save', function(next) {
  // Auto-update status based on stock level
  if (this.stock <= 0) {
    this.status = 'Out of Stock';
  } else if (this.stock <= this.minStockAlert) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

// ============================================
// Instance Methods
// ============================================
ingredientSchema.methods.updateStock = function(quantity, type) {
  if (type === 'add') {
    this.stock += quantity;
  } else if (type === 'remove') {
    if (this.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${this.stock}, Requested: ${quantity}`);
    }
    this.stock -= quantity;
  }
  
  // Update status
  if (this.stock <= 0) {
    this.status = 'Out of Stock';
  } else if (this.stock <= this.minStockAlert) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  
  return this.save();
};

ingredientSchema.methods.isLowStock = function() {
  return this.stock <= this.minStockAlert;
};

ingredientSchema.methods.isOutOfStock = function() {
  return this.stock <= 0;
};

// ============================================
// Static Methods
// ============================================
ingredientSchema.statics.findLowStock = function(tenantId) {
  return this.find({
    tenantId,
    isActive: true,
    $expr: { $lte: ['$stock', '$minStockAlert'] }
  }).sort({ stock: 1 });
};

ingredientSchema.statics.findExpiringSoon = function(tenantId, days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return this.find({
    tenantId,
    isActive: true,
    expiryDate: { $lte: expiryDate, $ne: null }
  }).sort({ expiryDate: 1 });
};

ingredientSchema.statics.getTotalStockValue = function(tenantId) {
  return this.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } },
    { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stock', '$costPerUnit'] } } } }
  ]);
};

// ============================================
// Virtuals
// ============================================
ingredientSchema.virtual('totalValue').get(function() {
  return this.stock * this.costPerUnit;
});

ingredientSchema.virtual('profitMargin').get(function() {
  if (this.costPerUnit === 0) return 0;
  return ((this.sellingPrice - this.costPerUnit) / this.costPerUnit) * 100;
});

ingredientSchema.set('toJSON', { virtuals: true });
ingredientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RestoIngredient', ingredientSchema);