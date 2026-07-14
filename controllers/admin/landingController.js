const Landing = require('../../models/admin/Landing');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const sections = await Landing.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  sendSuccess(res, sections);
});

const getAllAdmin = asyncHandler(async (req, res) => {
  const sections = await Landing.find().sort({ sortOrder: 1 }).lean();
  sendSuccess(res, sections);
});

const getBySection = asyncHandler(async (req, res) => {
  const section = await Landing.findOne({ section: req.params.section }).lean();
  if (!section) throw new ApiError(404, 'Section not found', 'SECTION_NOT_FOUND');
  sendSuccess(res, section);
});

const update = asyncHandler(async (req, res) => {
  const { title, subtitle, content, items, isActive, sortOrder } = req.body;

  const section = await Landing.findOneAndUpdate(
    { section: req.params.section },
    { title, subtitle, content, items, isActive, sortOrder },
    { new: true, upsert: true, runValidators: true }
  );

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'landing.updated',
    module: 'admin',
    resource: 'Landing',
    resourceId: section._id,
    details: { section: req.params.section },
  });

  sendSuccess(res, section, 'Section updated');
});

module.exports = { getAll, getAllAdmin, getBySection, update };