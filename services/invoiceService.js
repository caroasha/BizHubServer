const mongoose = require('mongoose');
const Invoice = require('../models/admin/Invoice');
const Settings = require('../models/admin/Settings');
const PaymentMethod = require('../models/admin/PaymentMethod');
const planService = require('./planService');
const logger = require('../utils/logger');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

const PUBLIC_FIELDS = {
    cash: ['name'],
    mpesa_send: ['phone', 'name'],
    mpesa_send_money: ['phone', 'name'],
    mpesa_till: ['tillNumber', 'name'],
    mpesa_paybill: ['paybillNumber', 'accountNumber', 'name'],
    bank: ['bankName', 'accountName', 'accountNumber', 'branch', 'swift'],
    stripe: ['publishableKey'],
    mpesa_stk: ['shortcode', 'name'],
};

const intervalLabel = (interval) => {
    if (!interval) return 'One-time';
    if (interval === 'one_time' || interval === 'once') return 'One-time';
    if (interval === 'yearly' || interval === 'year') return 'Annual';
    if (interval === 'monthly') return 'Monthly';
    if (interval === 'quarterly') return 'Quarterly';
    if (interval === 'weekly') return 'Weekly';
    if (interval === 'daily') return 'Daily';
    return 'One-time';
};

const sanitizeConfig = (code, config = {}) => {
    const allowed = PUBLIC_FIELDS[code] || [];
    const out = {};
    for (const key of allowed) {
        if (config[key] !== undefined && config[key] !== null && config[key] !== '') {
            out[key] = config[key];
        }
    }
    return out;
};

const substitute = (template, vars) => {
    if (typeof template !== 'string') return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (Object.prototype.hasOwnProperty.call(vars, key)) return String(vars[key]);
        return match;
    });
};

const buildVars = ({ amount, currency, invoiceNumber }) => ({
    sale_number: invoiceNumber,
    invoice_number: invoiceNumber,
    invoiceNumber,
    invoice: invoiceNumber,
    amount: Number(amount || 0).toLocaleString('en-KE'),
    amountRaw: amount,
    currency,
});

const buildInstruction = (method, { amount, currency, invoiceNumber }) => {
    const c = method.config || {};
    const vars = buildVars({ amount, currency, invoiceNumber });
    const amountStr = vars.amount;

    switch (method.code) {
        case 'mpesa_stk':
            return {
                code: 'mpesa_stk',
                mode: 'auto',
                title: 'M-Pesa STK Push',
                description: "Enter your M-Pesa phone number and we'll send a payment prompt to your phone.",
                action: { type: 'stk', label: 'Send STK to my phone', phoneField: true },
            };

        case 'cash':
            return {
                code: 'cash',
                mode: 'manual',
                title: 'Cash',
                description: 'Pay in cash at our office.',
                steps: [
                    'Visit our office during business hours',
                    `Mention invoice ${invoiceNumber}`,
                    `Pay ${currency} ${amountStr}`,
                    'Request a receipt for your records',
                ],
                recipient: {},
            };

        case 'mpesa_send':
        case 'mpesa_send_money':
            return {
                code: method.code,
                mode: 'manual',
                title: 'M-Pesa Send Money',
                description: 'Send money directly to our number.',
                steps: [
                    'Go to M-Pesa menu on your phone',
                    'Select "Send Money"',
                    `Enter number: ${c.phone || '[not configured]'}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    `Enter "${invoiceNumber}" as the reason if prompted`,
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: { phone: c.phone || null, name: c.name || null },
            };

        case 'mpesa_till':
            return {
                code: 'mpesa_till',
                mode: 'manual',
                title: 'M-Pesa Buy Goods (Till)',
                description: 'Pay via our Buy Goods till number.',
                steps: [
                    'Go to M-Pesa menu on your phone',
                    'Select "Lipa na M-Pesa"',
                    'Select "Buy Goods and Services"',
                    `Enter till number: ${c.tillNumber || '[not configured]'}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: { tillNumber: c.tillNumber || null, name: c.name || null },
            };

        case 'mpesa_paybill': {
            const accountNumber = substitute(c.accountNumber || invoiceNumber, vars);
            return {
                code: 'mpesa_paybill',
                mode: 'manual',
                title: 'M-Pesa Paybill',
                description: 'Pay via our Paybill number.',
                steps: [
                    'Go to M-Pesa menu on your phone',
                    'Select "Lipa na M-Pesa"',
                    'Select "Pay Bill"',
                    `Enter business number: ${c.paybillNumber || '[not configured]'}`,
                    `Enter account number: ${accountNumber}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: { paybillNumber: c.paybillNumber || null, accountNumber, name: c.name || null },
            };
        }

        case 'bank':
            return {
                code: 'bank',
                mode: 'manual',
                title: 'Bank Transfer',
                description: 'Transfer to our bank account.',
                steps: [
                    `Bank: ${c.bankName || '[not configured]'}`,
                    `Account name: ${c.accountName || '[not configured]'}`,
                    `Account number: ${c.accountNumber || '[not configured]'}`,
                    c.branch ? `Branch: ${c.branch}` : null,
                    c.swift ? `SWIFT: ${c.swift}` : null,
                    `Amount: ${currency} ${amountStr}`,
                    `Reference: ${invoiceNumber}`,
                    'Send us the bank reference once paid',
                ].filter(Boolean),
                recipient: {
                    bankName: c.bankName || null,
                    accountName: c.accountName || null,
                    accountNumber: c.accountNumber || null,
                    branch: c.branch || null,
                    swift: c.swift || null,
                },
            };

        case 'stripe':
            return {
                code: 'stripe',
                mode: 'auto',
                title: 'Card (Stripe)',
                description: 'Pay securely by card.',
                action: { type: 'stripe', label: 'Pay with card', amount, currency, invoiceNumber },
            };

        default:
            return null;
    }
};

const buildPaymentInstructions = async ({ amount, currency, invoiceNumber }) => {
    try {
        const methods = await PaymentMethod.find({ enabled: true }).sort({ order: 1 }).lean();
        const instructions = [];
        for (const m of methods) {
            const clean = { ...m, config: sanitizeConfig(m.code, m.config) };
            const built = buildInstruction(clean, { amount, currency, invoiceNumber });
            if (built) instructions.push(built);
        }
        return instructions;
    } catch (err) {
        logger.error('buildPaymentInstructions failed:', err.message);
        return [];
    }
};

const createInvoiceWithRetry = async (data, attempts = 5) => {
    for (let i = 0; i < attempts; i++) {
        try {
            return await Invoice.create({
                ...data,
                invoiceNumber: data.invoiceNumber || generateInvoiceNumber(),
            });
        } catch (err) {
            if (err.code !== 11000) throw err;
            logger.warn(`Invoice number collision, attempt ${i + 1}`);
        }
    }
    throw new Error('Could not generate a unique invoice number');
};

const generateInvoice = async ({
    tenantId,
    userId,
    userModel,
    user,
    plan,
    planPrice,
    planInterval,
    planDoc = null,
    type = 'registration',
    dueHoursOverride = null,
}) => {
    if (!tenantId || !userId || !user) {
        throw new Error('tenantId, userId and user are required');
    }

    const settings = await Settings.findOne().lean();
    const dueHours = dueHoursOverride || settings?.invoice?.dueHours || 3;

    const planName = plan || 'Starter';
    let price = Number(planPrice || 0);
    let interval = planInterval || 'monthly';

    if (planDoc) {
        price = Number(planDoc.price ?? price);
        interval = planDoc.cycle || planDoc.interval || interval;
    } else if (!planPrice || !planInterval) {
        const fetched = await planService.getByName(planName);
        if (fetched) {
            price = Number(fetched.price ?? price);
            interval = fetched.cycle || fetched.interval || interval;
        }
    }

    const label = intervalLabel(interval);
    const issuedAt = new Date();
    const dueDate = new Date(issuedAt.getTime() + dueHours * 60 * 60 * 1000);

    const items = [
        {
            name: `${planName} Plan`,
            description: label,
            qty: 1,
            unitPrice: price,
            subtotal: price,
        },
    ];

    const subtotal = price;
    const total = subtotal;
    const currency = settings?.default_currency || 'KES';
    const invoiceNumber = generateInvoiceNumber();

    const paymentInstructions = await buildPaymentInstructions({
        amount: total,
        currency,
        invoiceNumber,
    });

    const invoice = await createInvoiceWithRetry({
        invoiceNumber,
        tenantId,
        user: userId,
        userModel,
        plan: planName,
        planInterval: interval,
        type,
        items,
        subtotal,
        discount: 0,
        tax: 0,
        total,
        amountPaid: 0,
        amountDue: total,
        currency,
        customerSnapshot: {
            name: user.name,
            email: user.email,
            phone: user.phone || null,
        },
        status: 'sent',
        paymentState: 'unpaid',
        dueDate,
        issuedAt,
        sentAt: issuedAt,
        notes: `${type} invoice. Payment due within ${dueHours} hours.`,
        paymentInstructions,
    });

    logger.info(`Invoice created: ${invoice.invoiceNumber} for tenant ${tenantId}`);

    return { invoice, paymentInstructions };
};

module.exports = {
    generateInvoice,
    createInvoiceWithRetry,
    buildPaymentInstructions,
};