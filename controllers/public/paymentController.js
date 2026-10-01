const Invoice = require('../../models/admin/Invoice');
const Payment = require('../../models/admin/Payment');
const paymentInstructionsService = require('../../services/paymentInstructionsService');
const mpesaService = require('../../services/mpesaService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const extractMpesaError = (err) => {
    if (!err) return 'STK Push failed';
    if (typeof err === 'string') return err;
    return err.errorMessage || err.error || err.message || 'STK Push failed';
};

const rebuildInstructions = async (invoice) => {
    try {
        const fresh = await paymentInstructionsService.getPaymentInstructions({
            amount: invoice.amountDue ?? invoice.total ?? 0,
            currency: invoice.currency || 'KES',
            invoiceNumber: invoice.invoiceNumber,
        });
        return Array.isArray(fresh) ? fresh : [];
    } catch (err) {
        logger.error(
            `Fresh instructions failed for ${invoice.invoiceNumber}: ${err.message}`
        );
        return [];
    }
};

const getPaymentMethods = asyncHandler(async (req, res) => {
    const { amount, currency, invoiceNumber } = req.query;

    if (amount || invoiceNumber) {
        const methods = await paymentInstructionsService.getPaymentInstructions({
            amount: Number(amount) || 0,
            currency: currency || 'KES',
            invoiceNumber: invoiceNumber || '-',
        });
        return sendSuccess(res, { methods });
    }

    const methods = await paymentInstructionsService.getPublicPaymentMethods();
    return sendSuccess(res, { methods });
});

const sendStkForInvoice = asyncHandler(async (req, res) => {
    const { invoiceNumber, phone } = req.body;

    if (!invoiceNumber || !phone) {
        return sendError(res, 'invoiceNumber and phone required', 400);
    }

    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    if (invoice.status === 'paid') return sendError(res, 'Invoice already paid', 400);
    if (invoice.status === 'cancelled') return sendError(res, 'Invoice cancelled', 400);
    if (invoice.status === 'expired') return sendError(res, 'Invoice expired', 400);
    if (invoice.amountDue <= 0) return sendError(res, 'Nothing to pay', 400);

    const methods = await rebuildInstructions(invoice);
    const stkAllowed = methods.some((m) => m.code === 'mpesa_stk');
    if (!stkAllowed) {
        return sendError(
            res,
            'M-Pesa STK Push is not available for this invoice',
            400
        );
    }

    await Payment.updateMany(
        { invoice: invoice._id, status: 'pending' },
        { status: 'superseded' }
    );

    const stk = await mpesaService.stkPush({
        phone,
        amount: invoice.amountDue,
        accountRef: invoice.invoiceNumber.substring(0, 12),
        description: `Payment for ${invoice.invoiceNumber}`,
    });

    if (!stk.success) {
        const msg = extractMpesaError(stk.error);
        logger.error('STK push failed', {
            invoiceNumber: invoice.invoiceNumber,
            phone,
            error: stk.error,
        });
        return sendError(res, msg, 500);
    }

    await Payment.create({
        tenantId: invoice.tenantId,
        userId: invoice.user,
        userModel: invoice.userModel || null,
        invoice: invoice._id,
        purpose: invoice.type,
        method: 'mpesa_stk',
        amount: invoice.amountDue,
        currency: invoice.currency,
        status: 'pending',
        providerRef: stk.checkoutRequestId,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId || null,
        phone,
    });

    invoice.stkLastRequest = {
        checkoutRequestId: stk.checkoutRequestId,
        phone,
        requestedAt: new Date(),
    };
    invoice.paymentState = 'pending_stk';
    await invoice.save();

    logger.info('STK push initiated', {
        invoiceNumber: invoice.invoiceNumber,
        checkoutRequestId: stk.checkoutRequestId,
        amount: invoice.amountDue,
    });

    return sendSuccess(
        res,
        {
            checkoutRequestId: stk.checkoutRequestId,
            merchantRequestId: stk.merchantRequestId || null,
            message: stk.customerMessage || 'STK Push sent. Check your phone.',
        },
        'STK Push initiated'
    );
});

const checkStkStatus = asyncHandler(async (req, res) => {
    const { checkoutRequestId } = req.params;
    if (!checkoutRequestId) return sendError(res, 'checkoutRequestId required', 400);

    const payment = await Payment.findOne({ checkoutRequestId }).lean();
    if (!payment) return sendError(res, 'Payment not found', 404);

    const invoice = payment.invoice
        ? await Invoice.findById(payment.invoice)
            .select('invoiceNumber status paymentState amountPaid amountDue currency')
            .lean()
        : null;

    return sendSuccess(res, {
        status: payment.status,
        invoiceNumber: invoice?.invoiceNumber || null,
        invoiceStatus: invoice?.status || null,
        paymentState: invoice?.paymentState || null,
        amountPaid: invoice?.amountPaid || 0,
        amountDue: invoice?.amountDue || 0,
        currency: invoice?.currency || payment.currency,
        receipt: payment.status === 'success' ? payment.mpesaReceipt : null,
    });
});

const getInvoiceByNumber = asyncHandler(async (req, res) => {
    const { invoiceNumber } = req.params;
    if (!invoiceNumber) return sendError(res, 'Invoice number required', 400);

    const invoice = await Invoice.findOne({ invoiceNumber })
        .select('-__v -stkLastRequest')
        .lean();

    if (!invoice) return sendError(res, 'Invoice not found', 404);

    const freshInstructions = await rebuildInstructions(invoice);

    return sendSuccess(res, {
        invoice: {
            ...invoice,
            paymentInstructions: freshInstructions,
        },
    });
});

const checkMpesaConfig = asyncHandler(async (req, res) => {
    const config = mpesaService.getConfig();
    return sendSuccess(res, {
        configured: !!(
            config.consumerKey &&
            config.consumerSecret &&
            config.shortCode &&
            config.passkey
        ),
        environment: config.baseUrl.includes('sandbox') ? 'sandbox' : 'production',
        shortCode: config.shortCode ? '••••' + String(config.shortCode).slice(-4) : null,
        callbackUrl: config.callbackUrl || null,
        transactionType: config.transactionType,
    });
});

module.exports = {
    getPaymentMethods,
    sendStkForInvoice,
    checkStkStatus,
    getInvoiceByNumber,
    checkMpesaConfig,
};