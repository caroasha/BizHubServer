const PaymentMethod = require('../models/admin/PaymentMethod');
const logger = require('../utils/logger');

const getSettings = async () => {
    let doc = await PaymentMethod.findOne().lean();
    if (!doc) {
        try {
            doc = await PaymentMethod.create({});
        } catch (err) {
            logger.warn('Could not create PaymentMethod doc:', err.message);
            doc = null;
        }
    }
    return doc || {};
};

const buildMethodList = (doc) => {
    const list = [];

    if (doc.momoStkActive) {
        list.push({
            code: 'mpesa_stk',
            mode: 'auto',
            order: 1,
            label: 'M-Pesa STK Push',
        });
    }

    if (doc.momoSendActive && doc.momoSendNumber) {
        list.push({
            code: 'mpesa_send',
            mode: 'manual',
            order: 2,
            label: 'M-Pesa Send Money',
            phone: doc.momoSendNumber,
        });
    }

    if (doc.momoTillActive && doc.momoTillNumber) {
        list.push({
            code: 'mpesa_till',
            mode: 'manual',
            order: 3,
            label: 'M-Pesa Buy Goods (Till)',
            tillNumber: doc.momoTillNumber,
        });
    }

    if (doc.momoPaybillActive && doc.momoPaybillBusiness) {
        list.push({
            code: 'mpesa_paybill',
            mode: 'manual',
            order: 4,
            label: 'M-Pesa Paybill',
            paybillNumber: doc.momoPaybillBusiness,
            accountNumber: doc.momoPaybillAccount || null,
        });
    }

    if (doc.stripeActive) {
        list.push({
            code: 'stripe',
            mode: 'auto',
            order: 5,
            label: 'Card (Stripe)',
            publishableKey: doc.stripePublicKey || null,
        });
    }

    return list;
};

const substitute = (tpl, vars) => {
    if (typeof tpl !== 'string') return tpl;
    return tpl.replace(/\{(\w+)\}/g, (m, k) =>
        Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
    );
};

const buildInstructions = (m, { amount, currency, invoiceNumber }) => {
    const vars = {
        invoiceNumber,
        amount: Number(amount || 0).toLocaleString('en-KE'),
        currency,
    };
    const amountStr = vars.amount;

    switch (m.code) {
        case 'mpesa_stk':
            return {
                code: 'mpesa_stk',
                mode: 'auto',
                title: 'M-Pesa STK Push',
                description:
                    "Enter your M-Pesa phone number and we'll send a payment prompt to your phone.",
                action: {
                    type: 'stk',
                    label: 'Send STK to my phone',
                    phoneField: true,
                },
            };

        case 'mpesa_send':
            return {
                code: 'mpesa_send',
                mode: 'manual',
                title: 'M-Pesa Send Money',
                description: 'Send money directly to our number.',
                steps: [
                    'Go to M-Pesa menu on your phone',
                    'Select "Send Money"',
                    `Enter number: ${m.phone || '[not configured]'}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    `Enter "${invoiceNumber}" as the reason if prompted`,
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: { phone: m.phone, name: null },
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
                    `Enter till number: ${m.tillNumber || '[not configured]'}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: { tillNumber: m.tillNumber, name: null },
            };

        case 'mpesa_paybill': {
            const accountNumber = substitute(m.accountNumber || invoiceNumber, vars);
            return {
                code: 'mpesa_paybill',
                mode: 'manual',
                title: 'M-Pesa Paybill',
                description: 'Pay via our Paybill number.',
                steps: [
                    'Go to M-Pesa menu on your phone',
                    'Select "Lipa na M-Pesa"',
                    'Select "Pay Bill"',
                    `Enter business number: ${m.paybillNumber || '[not configured]'}`,
                    `Enter account number: ${accountNumber}`,
                    `Enter amount: ${currency} ${amountStr}`,
                    'Enter your M-Pesa PIN and confirm',
                    'Keep the M-Pesa confirmation code',
                ],
                recipient: {
                    paybillNumber: m.paybillNumber,
                    accountNumber,
                    name: null,
                },
            };
        }

        case 'stripe':
            return {
                code: 'stripe',
                mode: 'auto',
                title: 'Card (Stripe)',
                description: 'Pay securely by card.',
                action: {
                    type: 'stripe',
                    label: 'Pay with card',
                    amount,
                    currency,
                    invoiceNumber,
                },
            };

        default:
            return null;
    }
};

async function getPaymentInstructions({ amount, currency, invoiceNumber }) {
    const doc = await getSettings();
    const methods = buildMethodList(doc);
    const instructions = [];
    for (const m of methods) {
        const built = buildInstructions(m, { amount, currency, invoiceNumber });
        if (built) instructions.push(built);
    }
    return instructions;
}

async function getPublicPaymentMethods() {
    const doc = await getSettings();
    const methods = buildMethodList(doc);
    return methods.map((m) => ({
        code: m.code,
        label: m.label,
        mode: m.mode,
    }));
}

async function getPublicPaymentMethodsWithInstructions({
    amount = 0,
    currency = 'KES',
    invoiceNumber = '-',
} = {}) {
    const doc = await getSettings();
    const methods = buildMethodList(doc);
    const list = [];
    for (const m of methods) {
        const built = buildInstructions(m, { amount, currency, invoiceNumber });
        if (built) {
            list.push({
                code: m.code,
                label: m.label,
                mode: m.mode,
                title: built.title,
                description: built.description,
                steps: built.steps,
                recipient: built.recipient,
                action: built.action,
            });
        }
    }
    return list;
}

module.exports = {
    getPaymentInstructions,
    getPublicPaymentMethods,
    getPublicPaymentMethodsWithInstructions,
    buildInstructions,
};