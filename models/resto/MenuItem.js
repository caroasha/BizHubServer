const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side Dish'],
    default: 'Main Course',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  preparationTime: {
    type: Number,
    default: 15,
    min: 0,
  },
  image: {
    type: String,
    default: 'fa-utensils',
  },
  available: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
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

menuItemSchema.index({ tenantId: 1, name: 1 });
menuItemSchema.index({ tenantId: 1, category: 1 });
menuItemSchema.index({ tenantId: 1, available: 1 });

module.exports = mongoose.model('RestoMenuItem', menuItemSchema);