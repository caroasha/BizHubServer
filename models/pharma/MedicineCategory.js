const mongoose = require('mongoose');

const medicineCategorySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('MedicineCategory', medicineCategorySchema);