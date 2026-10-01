const AiSettings = require('../../models/admin/AiSettings');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const maskKey = (key) => {
  if (!key || key.length <= 10) return key;
  return key.substring(0, 10) + '••••••••••••••••';
};

const getSettings = asyncHandler(async (req, res) => {
  let settings = await AiSettings.findOne().lean();
  if (!settings) {
    settings = await AiSettings.create({});
  }

  const result = { ...settings };
  if (result.apiKey) {
    result.apiKey = maskKey(result.apiKey);
  }

  sendSuccess(res, result);
});

const updateSettings = asyncHandler(async (req, res) => {
  const {
    baseUrl, apiKey, model,
    landingAiEnabled, clientAiEnabled, fileUploadEnabled,
    color, position, aiName, defaultGreeting,
    rateLimitEnabled, rateLimitMaxRequests, rateLimitWindowMinutes,
    landingSystemPrompt,
  } = req.body;

  let settings = await AiSettings.findOne();
  if (!settings) {
    settings = new AiSettings();
  }

  if (baseUrl !== undefined) settings.baseUrl = baseUrl;
  if (apiKey !== undefined && apiKey !== '' && !apiKey.includes('••••')) {
    settings.apiKey = apiKey;
  }
  if (model !== undefined) settings.model = model;
  if (landingAiEnabled !== undefined) settings.landingAiEnabled = landingAiEnabled;
  if (clientAiEnabled !== undefined) settings.clientAiEnabled = clientAiEnabled;
  if (fileUploadEnabled !== undefined) settings.fileUploadEnabled = fileUploadEnabled;
  if (color !== undefined) settings.color = color;
  if (position !== undefined) settings.position = position;
  if (aiName !== undefined) settings.aiName = aiName;
  if (defaultGreeting !== undefined) settings.defaultGreeting = defaultGreeting;
  if (rateLimitEnabled !== undefined) settings.rateLimitEnabled = rateLimitEnabled;
  if (rateLimitMaxRequests !== undefined) settings.rateLimitMaxRequests = rateLimitMaxRequests;
  if (rateLimitWindowMinutes !== undefined) settings.rateLimitWindowMinutes = rateLimitWindowMinutes;
  if (landingSystemPrompt !== undefined) settings.landingSystemPrompt = landingSystemPrompt;

  settings.updatedBy = req.admin._id;
  await settings.save();

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ai_settings.updated',
    module: 'admin',
    resource: 'AiSettings',
    resourceId: settings._id,
    details: { ...req.body, apiKey: apiKey ? '[UPDATED]' : '[UNCHANGED]' },
  });

  const result = settings.toObject();
  if (result.apiKey) {
    result.apiKey = maskKey(result.apiKey);
  }

  sendSuccess(res, result, 'AI settings updated');
});

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await AiSettings.findOne().lean();

  if (!settings) {
    return sendSuccess(res, {
      landingAiEnabled: false,
      clientAiEnabled: false,
      color: '#1a73e8',
      position: 'bottom-right',
      aiName: 'BizHub Assistant',
      defaultGreeting: 'Hello! How can I help you today?',
    });
  }

  sendSuccess(res, {
    landingAiEnabled: settings.landingAiEnabled,
    clientAiEnabled: settings.clientAiEnabled,
    color: settings.color,
    position: settings.position,
    aiName: settings.aiName,
    defaultGreeting: settings.defaultGreeting,
  });
});

module.exports = { getSettings, updateSettings, getPublicSettings };