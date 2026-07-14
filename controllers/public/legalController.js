const Legal = require('../../models/admin/Legal');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const legals = await Legal.find({ status: 'published' })
    .select('type title slug version effectiveDate requiresAcceptance')
    .sort({ type: 1 })
    .lean();
  sendSuccess(res, legals);
});

const getByType = asyncHandler(async (req, res) => {
  const legal = await Legal.findOne({ type: req.params.type, status: 'published' }).lean();
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');
  sendSuccess(res, legal);
});

const accept = asyncHandler(async (req, res) => {
  const { tenantId, acceptedBy, acceptedByName } = req.body;
  if (!tenantId || !acceptedBy) throw new ApiError(400, 'Tenant ID and accepted by required');

  const legal = await Legal.findOne({ type: req.params.type, status: 'published' });
  if (!legal) throw new ApiError(404, 'Document not found', 'LEGAL_NOT_FOUND');

  const alreadyAccepted = legal.acceptedBy.find(
    (a) => a.tenantId.toString() === tenantId && a.acceptedVersion === legal.version
  );

  if (!alreadyAccepted) {
    legal.acceptedBy.push({
      tenantId,
      acceptedBy: acceptedByName || 'User',
      ipAddress: req.ip,
      acceptedVersion: legal.version,
      acceptedAt: new Date(),
    });
    await legal.save();
  }

  sendSuccess(res, null, 'Document accepted');
});

const checkAcceptance = asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const legals = await Legal.find({
    status: 'published',
    requiresAcceptance: true,
  }).lean();

  const acceptanceStatus = legals.map((legal) => ({
    type: legal.type,
    title: legal.title,
    version: legal.version,
    accepted: legal.acceptedBy.some(
      (a) => a.tenantId.toString() === tenantId && a.acceptedVersion === legal.version
    ),
  }));

  sendSuccess(res, acceptanceStatus);
});

module.exports = { getAll, getByType, accept, checkAcceptance };