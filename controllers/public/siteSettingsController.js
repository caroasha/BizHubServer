const Settings = require('../../models/admin/Settings');
const Legal = require('../../models/admin/Legal');
const Landing = require('../../models/admin/Landing');
const Plans = require('../../models/admin/Plans');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.find({ isPublic: true }).lean();
  const settingsMap = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });
  sendSuccess(res, settingsMap);
});

const getPublicLegal = asyncHandler(async (req, res) => {
  const legals = await Legal.find({ status: 'published' })
    .select('type title slug version effectiveDate content requiresAcceptance')
    .lean();
  sendSuccess(res, legals);
});

const getPublicLegalByType = asyncHandler(async (req, res) => {
  const legal = await Legal.findOne({ type: req.params.type, status: 'published' })
    .select('type title slug version effectiveDate content requiresAcceptance')
    .lean();
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');
  sendSuccess(res, legal);
});

const getPublicPlans = asyncHandler(async (req, res) => {
  const plans = await Plans.find({ isActive: true })
    .select('name slug price currency interval features highlighted maxModules maxUsers maxStorageMB')
    .sort({ sortOrder: 1 })
    .lean();
  sendSuccess(res, plans);
});

const getPublicModules = asyncHandler(async (req, res) => {
  const modules = await Landing.find({ section: 'modules', isActive: true })
    .select('items')
    .lean();

  const moduleList = modules[0]?.items || [];
  sendSuccess(res, moduleList);
});

const getPublicFaqs = asyncHandler(async (req, res) => {
  const faqSection = await Landing.findOne({ section: 'faq', isActive: true })
    .select('items')
    .lean();

  sendSuccess(res, faqSection?.items || []);
});

const getPublicTestimonials = asyncHandler(async (req, res) => {
  const testimonialSection = await Landing.findOne({ section: 'testimonials', isActive: true })
    .select('items')
    .lean();

  sendSuccess(res, testimonialSection?.items || []);
});

module.exports = { getPublicSettings, getPublicLegal, getPublicLegalByType, getPublicPlans, getPublicModules, getPublicFaqs, getPublicTestimonials };