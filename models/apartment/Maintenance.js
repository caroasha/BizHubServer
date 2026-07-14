const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  issue: { type: String, required: true },
  description: { type: String, trim: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['reported', 'in-progress', 'completed'], default: 'reported' },
  cost: { type: Number, default: 0 },
  scheduledDate: { type: Date },
  completedDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ApartmentUser' },
}, { timestamps: true });
module.exports = mongoose.model('Maintenance', schema);