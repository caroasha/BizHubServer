const env = require('../config/env');
const logger = require('../utils/logger');
const brevoClient = require('../config/brevo');
const hdmBridgeClient = require('../config/hdmBridge');

let settingsCache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

const loadSettings = async () => {
    if (settingsCache && Date.now() - cacheAt < CACHE_MS) return settingsCache;
    try {
        const Settings = require('../models/admin/Settings');
        const docs = await Settings.find({
            key: {
                $in: [
                    'email_provider',
                    'sender_email',
                    'sender_name',
                    'email_enabled',
                ],
            },
        }).lean();
        const map = {};
        docs.forEach((d) => {
            map[d.key] = d.value;
        });
        settingsCache = map;
        cacheAt = Date.now();
        return map;
    } catch {
        return {};
    }
};

const getConfig = async () => {
    const s = await loadSettings();
    return {
        enabled: s.email_enabled !== 'false',
        provider: s.email_provider || env.EMAIL_PROVIDER || 'hdmBridge',
        fromEmail: s.sender_email || env.HDM_FROM_EMAIL || 'noreply@bizhub.co.ke',
        fromName: s.sender_name || env.HDM_FROM_NAME || env.APP_NAME || 'BizHub',
    };
};

/* Normalize arguments so all these work:
 *   send({ to, subject, html })
 *   send(to, subject, html)
 *   send(to, { subject, html })
 */
const normalizeParams = (args) => {
    if (args.length === 1 && typeof args[0] === 'object') return args[0];
    if (args.length >= 3) return { to: args[0], subject: args[1], html: args[2] };
    if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'object') {
        return { to: args[0], ...args[1] };
    }
    return {};
};

/* ─────────────────────────────────────────────────────────────
 * Template renderer — throws if template name not found.
 * ───────────────────────────────────────────────────────────── */
const renderTemplate = async (templates, name, data) => {
    if (typeof name === 'string') {
        if (!templates[name]) {
            throw new Error(`Email template not found: ${name}`);
        }
        const result = await templates[name](data || {});
        if (result && typeof result === 'object' && 'html' in result) {
            return {
                subject: result.subject || data?.subject || `${env.APP_NAME || 'BizHub'} Notification`,
                html: result.html,
            };
        }
        return {
            subject: data?.subject || `${env.APP_NAME || 'BizHub'} Notification`,
            html: String(result || ''),
        };
    }
    if (typeof name === 'object' && name?.html) {
        return {
            subject: name.subject || `${env.APP_NAME || 'BizHub'} Notification`,
            html: name.html,
        };
    }
    throw new Error('Invalid email template');
};

/* ─────────────────────────────────────────────────────────────
 * Brevo
 * ───────────────────────────────────────────────────────────── */
const sendViaBrevo = async ({ to, subject, html, cc, bcc, replyTo, attachments }) => {
    const config = await getConfig();
    try {
        const payload = {
            sender: { name: config.fromName, email: config.fromEmail },
            to: Array.isArray(to)
                ? to.map((e) => ({ email: e }))
                : [{ email: to }],
            subject,
            htmlContent: html,
        };

        if (cc) {
            payload.cc = Array.isArray(cc)
                ? cc.map((e) => ({ email: e }))
                : [{ email: cc }];
        }
        if (bcc) {
            payload.bcc = Array.isArray(bcc)
                ? bcc.map((e) => ({ email: e }))
                : [{ email: bcc }];
        }
        if (replyTo) payload.replyTo = { email: replyTo };
        if (attachments?.length) {
            payload.attachment = attachments.map((a) => ({
                name: a.filename,
                content: Buffer.isBuffer(a.content)
                    ? a.content.toString('base64')
                    : a.content,
            }));
        }

        const res = await brevoClient.post('/smtp/email', payload);
        logger.info('Email sent via Brevo', {
            to,
            subject,
            messageId: res.data?.messageId,
        });
        return { success: true, messageId: res.data?.messageId, provider: 'brevo' };
    } catch (err) {
        logger.error('Brevo email failed', {
            to,
            subject,
            status: err.response?.status,
            error: err.response?.data || err.message,
        });
        return {
            success: false,
            error: err.response?.data?.message || err.message,
            provider: 'brevo',
        };
    }
};

/* ─────────────────────────────────────────────────────────────
 * HDM Bridge
 * ───────────────────────────────────────────────────────────── */
const sendViaHDM = async ({ to, subject, html, cc, bcc, replyTo, attachments }) => {
    const config = await getConfig();
    try {
        const toArray = Array.isArray(to)
            ? to.map((e) => ({ email: e }))
            : [{ email: to }];

        const payload = {
            from: config.fromEmail,
            fromName: config.fromName,
            to: toArray,
            subject,
            htmlBody: html,
        };

        if (cc) {
            payload.cc = Array.isArray(cc)
                ? cc.map((e) => ({ email: e }))
                : [{ email: cc }];
        }
        if (bcc) {
            payload.bcc = Array.isArray(bcc)
                ? bcc.map((e) => ({ email: e }))
                : [{ email: bcc }];
        }
        if (replyTo) {
            payload.replyTo = { email: replyTo };
        }
        if (attachments?.length) {
            payload.attachments = attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.isBuffer(a.content)
                    ? a.content.toString('base64')
                    : a.content,
            }));
        }

        const res = await hdmBridgeClient.post('/emails/send', payload);
        logger.info('Email sent via HDM Bridge', {
            to,
            subject,
            messageId: res.data?.id,
        });
        return { success: true, messageId: res.data?.id, provider: 'hdmBridge' };
    } catch (err) {
        logger.error('HDM Bridge email failed', {
            to,
            subject,
            status: err.response?.status,
            error: err.response?.data || err.message,
        });
        return {
            success: false,
            error: err.response?.data?.message || err.message,
            provider: 'hdmBridge',
        };
    }
};

/* ─────────────────────────────────────────────────────────────
 * Public API
 * ───────────────────────────────────────────────────────────── */
const send = async (...args) => {
    const params = normalizeParams(args);

    if (!params.to) {
        logger.warn('Email skipped: no recipient');
        return { success: false, error: 'No recipient' };
    }

    const config = await getConfig();
    if (!config.enabled) {
        logger.info('Email skipped: globally disabled', { to: params.to });
        return { success: false, error: 'Email disabled' };
    }

    if (!params.html || typeof params.html !== 'string') {
        logger.error('Email skipped: invalid html content', {
            to: params.to,
            subject: params.subject,
        });
        return { success: false, error: 'Invalid content' };
    }

    const payload = {
        to: params.to,
        subject: params.subject || `${env.APP_NAME || 'BizHub'} Notification`,
        html: params.html,
        cc: params.cc,
        bcc: params.bcc,
        replyTo: params.replyTo,
        attachments: params.attachments,
    };

    if (config.provider === 'brevo') return sendViaBrevo(payload);
    return sendViaHDM(payload);
};

const sendTemplate = async (templateName, to, data) => {
    try {
        const templates = require('../templates/emailTemplates');
        const rendered = await renderTemplate(templates, templateName, data);
        return send({ to, subject: rendered.subject, html: rendered.html });
    } catch (err) {
        logger.error('Email template render failed', {
            template: templateName,
            to,
            error: err.message,
        });
        return { success: false, error: err.message };
    }
};

const sendBulk = async (recipients, subject, html) => {
    const results = await Promise.allSettled(
        recipients.map((to) => send({ to, subject, html }))
    );
    const sent = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = recipients.length - sent;
    logger.info('Bulk email complete', { sent, failed, total: recipients.length });
    return { success: failed === 0, sent, failed, total: recipients.length };
};

const verifyProvider = async () => {
    const config = await getConfig();
    return {
        provider: config.provider,
        enabled: config.enabled,
        fromEmail: config.fromEmail,
    };
};

module.exports = {
    send,
    sendTemplate,
    sendBulk,
    verifyProvider,
    getConfig,
};