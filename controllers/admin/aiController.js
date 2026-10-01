const Ai = require('../../models/admin/Ai');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getLandingAi = asyncHandler(async (req, res) => {
  const ai = await Ai.findOne({ type: 'landing', isActive: true }).lean();
  sendSuccess(res, ai);
});

const getClientAi = asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const ai = await Ai.findOne({ tenantId, type: 'client', isActive: true }).lean();
  sendSuccess(res, ai);
});

const updateLandingAi = asyncHandler(async (req, res) => {
  const { systemPrompt, context } = req.body;

  const ai = await Ai.findOneAndUpdate(
    { type: 'landing' },
    { systemPrompt, context },
    { new: true, upsert: true }
  );

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ai.landing_updated',
    module: 'admin',
    resource: 'Ai',
    resourceId: ai._id,
  });

  sendSuccess(res, ai, 'Landing AI updated');
});

const updateClientAi = asyncHandler(async (req, res) => {
  const { tenantId, systemPrompt, context } = req.body;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const ai = await Ai.findOneAndUpdate(
    { tenantId, type: 'client' },
    { systemPrompt, context },
    { new: true, upsert: true }
  );

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ai.client_updated',
    module: 'admin',
    resource: 'Ai',
    resourceId: ai._id,
  });

  sendSuccess(res, ai, 'Client AI updated');
});

const getChatHistory = asyncHandler(async (req, res) => {
  const { tenantId, type = 'landing' } = req.query;
  const filter = type === 'client' ? { tenantId, type: 'client' } : { type: 'landing' };

  const ai = await Ai.findOne(filter).select('chatHistory').lean();
  sendSuccess(res, ai?.chatHistory || []);
});

const clearChatHistory = asyncHandler(async (req, res) => {
  const { tenantId, type = 'landing' } = req.body;
  const filter = type === 'client' ? { tenantId, type: 'client' } : { type: 'landing' };

  const ai = await Ai.findOneAndUpdate(filter, { chatHistory: [] }, { new: true });

  await AuditLog.create({
    tenantId: tenantId || null,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ai.chat_cleared',
    module: 'admin',
    resource: 'Ai',
    resourceId: ai?._id,
    details: { type },
  });

  sendSuccess(res, null, 'Chat history cleared');
});

module.exports = { getLandingAi, getClientAi, updateLandingAi, updateClientAi, getChatHistory, clearChatHistory };