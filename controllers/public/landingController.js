const Landing = require('../../models/admin/Landing');
const Ai = require('../../models/admin/Ai');
const SupportTicket = require('../../models/admin/SupportTicket');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const aiService = require('../../services/aiService');
const emailService = require('../../services/emailService');

const getLandingContent = asyncHandler(async (req, res) => {
  const sections = await Landing.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  sendSuccess(res, sections);
});

const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) throw new ApiError(400, 'Name, email, and message required');

  await SupportTicket.create({
    tenantId: null,
    userId: null,
    subject: subject || 'Contact Form Submission',
    message: `From: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\n${message}`,
    category: 'other',
    module: 'general',
    priority: 'medium',
    status: 'open',
  });

  await emailService.send({
    to: email,
    subject: 'Thank you for contacting BizHub',
    html: `<h1>Thank You!</h1><p>Hi ${name},</p><p>We've received your message and will get back to you within 24 hours.</p><p>For urgent inquiries, call +254 700 000 000.</p>`,
  });

  sendSuccess(res, null, 'Message sent');
});

const requestDemo = asyncHandler(async (req, res) => {
  const { name, email, phone, businessType, businessName } = req.body;
  if (!name || !email) throw new ApiError(400, 'Name and email required');

  await emailService.send({
    to: 'sales@bizhub.co.ke',
    subject: `Demo Request - ${businessName || name}`,
    html: `<h1>Demo Request</h1><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone || 'N/A'}</p><p><strong>Business Type:</strong> ${businessType || 'Not specified'}</p><p><strong>Business Name:</strong> ${businessName || 'Not specified'}</p>`,
  });

  await emailService.send({
    to: email,
    subject: 'Demo Request Received - BizHub',
    html: `<h1>Demo Request Received</h1><p>Hi ${name},</p><p>Thank you for your interest in BizHub! Our team will contact you within 24 hours to schedule your personalized demo.</p>`,
  });

  sendSuccess(res, null, 'Demo request submitted');
});

const aiChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) throw new ApiError(400, 'Message required');

  const result = await aiService.landingChat(message);

  const ai = await Ai.findOne({ type: 'landing' });
  if (ai) {
    ai.chatHistory.push({ role: 'user', message, tokensUsed: 0 });
    ai.chatHistory.push({ role: 'assistant', message: result.reply, tokensUsed: result.tokensUsed || 0, provider: result.provider });
    await ai.save();
  }

  sendSuccess(res, result);
});

module.exports = { getLandingContent, submitContact, requestDemo, aiChat };