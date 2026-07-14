const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

const getAiConfig = async () => {
  try {
    const AiSettings = require('../models/admin/AiSettings');
    let settings = await AiSettings.findOne().lean();
    if (!settings) settings = await AiSettings.create({});
    return {
      baseUrl: settings.baseUrl || env.HDM_AI_BASE_URL,
      apiKey: settings.apiKey || env.HDM_AI_API_KEY,
      model: settings.model || 'groq',
      landingAiEnabled: settings.landingAiEnabled,
      clientAiEnabled: settings.clientAiEnabled,
      landingSystemPrompt: settings.landingSystemPrompt,
      rateLimitEnabled: settings.rateLimitEnabled,
      rateLimitMaxRequests: settings.rateLimitMaxRequests,
      rateLimitWindowMinutes: settings.rateLimitWindowMinutes,
      aiName: settings.aiName || 'BizHub Assistant',
      defaultGreeting: settings.defaultGreeting || 'Hello! How can I help you today?',
    };
  } catch {
    return {
      baseUrl: env.HDM_AI_BASE_URL, apiKey: env.HDM_AI_API_KEY, model: 'groq',
      landingAiEnabled: true, clientAiEnabled: true, landingSystemPrompt: null,
      rateLimitEnabled: true, rateLimitMaxRequests: 20, rateLimitWindowMinutes: 15,
      aiName: 'BizHub Assistant', defaultGreeting: 'Hello! How can I help you today?',
    };
  }
};

const buildLandingPrompt = async () => {
  try {
    const Settings = require('../models/admin/Settings');
    const Plans = require('../models/admin/Plans');
    const Landing = require('../models/admin/Landing');

    const [settings, plans, landingModules, faqs] = await Promise.all([
      Settings.find({ key: { $in: ['system_name', 'support_email', 'support_phone', 'trial_days', 'default_currency'] } }).lean(),
      Plans.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      Landing.findOne({ section: 'modules', isActive: true }).lean(),
      Landing.findOne({ section: 'faq', isActive: true }).lean(),
    ]);

    const s = {}; settings.forEach(x => { s[x.key] = x.value; });
    const systemName = s.system_name || 'BizHub';
    const supportEmail = s.support_email || 'support@bizhub.co.ke';
    const supportPhone = s.support_phone || '+254 700 000 000';
    const trialDays = s.trial_days || '14';
    const currency = s.default_currency || 'KES';

    const modulesList = landingModules?.items?.map(m => `- ${m.title}: ${m.description}`).join('\n') || 
      `1. RestoManagerKE - Restaurant management (POS, menu, tables, orders, kitchen, inventory)
2. PharmaSys - Pharmacy management (inventory, prescriptions, POS, supplier orders, expiry tracking)
3. MyApartment - Property rental management (tenants, leases, rent collection, maintenance)
4. ElectroStore - Electronics shop management (inventory, sales, repairs, warranty tracking)
5. DigitalManager - Cyber café management (time billing, computer management, printing services)`;

    const plansList = plans.map(p => {
      const cycleLabel = { trial: 'Free Trial', monthly: '/month', yearly: '/year', permanent: ' (One-time)' }[p.cycle] || '';
      return `- ${p.name}: ${p.price === 0 ? 'Free' : `${currency} ${p.price.toLocaleString()}${cycleLabel}`} - ${p.maxUsers === -1 ? 'Unlimited' : p.maxUsers} users, ${p.maxStorageMB === -1 ? 'Unlimited' : p.maxStorageMB + 'MB'} storage`;
    }).join('\n');

    const faqList = faqs?.items?.slice(0, 5).map(f => `Q: ${f.title}\nA: ${f.description || f.content}`).join('\n\n') || '';

    return `You are the ${systemName} assistant, helping visitors on the landing page.

ABOUT:
${systemName} is a universal business management SaaS platform. It contains 5 independent modules:
${modulesList}

PLANS & PRICING:
${plansList}
All plans come with a ${trialDays}-day free trial. No credit card required.

PAYMENT METHODS: M-Pesa STK Push, Send Money, Till Number, Paybill, and Stripe.

SUPPORT:
Email: ${supportEmail}
Phone: ${supportPhone}

${faqList ? 'COMMON QUESTIONS:\n' + faqList : ''}

Be helpful, friendly, and guide visitors to the right plan or module for their business.`;
  } catch (err) {
    logger.error('Failed to build landing prompt:', err.message);
    return `You are the BizHub assistant. We offer 5 business modules: RestoManagerKE, PharmaSys, MyApartment, ElectroStore, DigitalManager. Plans start from Free Trial to Enterprise. 14-day free trial. M-Pesa payments supported. Contact support@bizhub.co.ke for help.`;
  }
};

let cachedPrompt = null;
let cacheTime = null;

const getLandingPrompt = async () => {
  if (cachedPrompt && cacheTime && Date.now() - cacheTime < 300000) return cachedPrompt;
  cachedPrompt = await buildLandingPrompt();
  cacheTime = Date.now();
  return cachedPrompt;
};

const callAi = async (message, systemPrompt) => {
  const config = await getAiConfig();
  if (!config.apiKey) return { success: false, reply: 'AI not configured.', tokensUsed: 0, provider: null };
  const response = await axios.post(`${config.baseUrl}/projects/general/public-chat`, { message, system_prompt: systemPrompt }, { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
  const { success, data } = response.data;
  return { success: success || true, reply: data?.reply || 'I am unable to assist.', tokensUsed: data?.tokens_used || 0, provider: data?.provider || config.model };
};

const getClientSystemPrompt = (businessType, businessName, context) => {
  const prompts = {
    restaurant: `You are the AI assistant for ${businessName}, a restaurant using BizHub RestoManagerKE. ${context || 'Help with menu, orders, tables, inventory, and staff.'}`,
    pharmacy: `You are the AI assistant for ${businessName}, a pharmacy using BizHub PharmaSys. ${context || 'Help with medicines, prescriptions, sales, suppliers, and expiry alerts.'}`,
    apartment: `You are the AI assistant for ${businessName}, a property manager using BizHub MyApartment. ${context || 'Help with units, tenants, leases, rent, and maintenance.'}`,
    electronics: `You are the AI assistant for ${businessName}, an electronics store using BizHub ElectroStore. ${context || 'Help with products, sales, repairs, warranties, and suppliers.'}`,
    cyber: `You are the AI assistant for ${businessName}, a cyber café using BizHub DigitalManager. ${context || 'Help with computers, sessions, services, packages, and customers.'}`,
  };
  return prompts[businessType] || `You are the AI assistant for ${businessName}. ${context || 'How can I help you?'}`;
};

const landingChat = async (message) => {
  try {
    const config = await getAiConfig();
    if (!config.landingAiEnabled) return { success: false, reply: 'AI assistant is currently unavailable.', tokensUsed: 0, provider: null };
    const systemPrompt = config.landingSystemPrompt || await getLandingPrompt();
    return await callAi(message, systemPrompt);
  } catch (error) { logger.error('Landing AI error:', error.response?.data || error.message); return { success: false, reply: 'Sorry, I am having trouble responding.', tokensUsed: 0, provider: null }; }
};

const clientChat = async ({ businessType, businessName, message, context }) => {
  try {
    const config = await getAiConfig();
    if (!config.clientAiEnabled) return { success: false, reply: 'AI assistant is currently unavailable.', tokensUsed: 0, provider: null };
    return await callAi(message, getClientSystemPrompt(businessType, businessName, context));
  } catch (error) { logger.error('Client AI error:', error.response?.data || error.message); return { success: false, reply: 'Sorry, I am having trouble responding.', tokensUsed: 0, provider: null }; }
};

const generateSupportResponse = async ({ ticketSubject, ticketMessage, businessType, businessName }) => {
  try {
    const systemPrompt = `You are a support agent for BizHub. Customer uses ${businessType} module. Business: ${businessName}. Provide a helpful response.`;
    return await callAi(`Subject: ${ticketSubject}\n\nMessage: ${ticketMessage}`, systemPrompt);
  } catch (error) { return { success: false, reply: 'A support agent will respond shortly.', tokensUsed: 0 }; }
};

module.exports = { landingChat, clientChat, generateSupportResponse };