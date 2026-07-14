const Legal = require('../../models/admin/Legal');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const legals = await Legal.find(filter).select('-content').sort({ type: 1 }).lean();
  sendSuccess(res, legals);
});

const getByType = asyncHandler(async (req, res) => {
  const legal = await Legal.findOne({ type: req.params.type }).lean();
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');
  sendSuccess(res, legal);
});

const create = asyncHandler(async (req, res) => {
  const { type, title, slug, content, version, effectiveDate, status, requiresAcceptance } = req.body;

  const legal = await Legal.create({
    type, title, slug, content, version, effectiveDate, status, requiresAcceptance,
  });

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'legal.created',
    module: 'admin',
    resource: 'Legal',
    resourceId: legal._id,
    details: { type, version },
  });

  sendSuccess(res, legal, 'Document created', 201);
});

const update = asyncHandler(async (req, res) => {
  const legal = await Legal.findOneAndUpdate(
    { type: req.params.type },
    { ...req.body, lastReviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'legal.updated',
    module: 'admin',
    resource: 'Legal',
    resourceId: legal._id,
    details: { type: req.params.type },
  });

  sendSuccess(res, legal, 'Document updated');
});

const publish = asyncHandler(async (req, res) => {
  const legal = await Legal.findOne({ type: req.params.type });
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');

  legal.status = 'published';
  legal.publishedBy = req.admin._id;
  legal.publishedAt = new Date();
  await legal.save();

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'legal.published',
    module: 'admin',
    resource: 'Legal',
    resourceId: legal._id,
    details: { type: req.params.type },
  });

  sendSuccess(res, legal, 'Document published');
});

const archive = asyncHandler(async (req, res) => {
  const legal = await Legal.findOne({ type: req.params.type });
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');

  legal.status = 'archived';
  await legal.save();

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'legal.archived',
    module: 'admin',
    resource: 'Legal',
    resourceId: legal._id,
    details: { type: req.params.type },
  });

  sendSuccess(res, legal, 'Document archived');
});

module.exports = { getAll, getByType, create, update, publish, archive };