const Invoice = require('../../models/admin/Invoice');
const Payment = require('../../models/admin/Payment');
const paymentInstructionsService = require('../../services/paymentInstructionsService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

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

const getInvoiceStatus = asyncHandler(async (req, res) => {
    const { invoiceNumber } = req.params;
    if (!invoiceNumber) return sendError(res, 'Invoice number required', 400);

    const invoice = await Invoice.findOne({ invoiceNumber })
        .select(
            'invoiceNumber status paymentState amountPaid amountDue currency paidAt paymentMethod paymentRef'
        )
        .lean();

    if (!invoice) return sendError(res, 'Invoice not found', 404);

    return sendSuccess(res, { invoice });
});

const getInvoicePayments = asyncHandler(async (req, res) => {
    const { invoiceNumber } = req.params;
    if (!invoiceNumber) return sendError(res, 'Invoice number required', 400);

    const invoice = await Invoice.findOne({ invoiceNumber }).select('_id').lean();
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    const payments = await Payment.find({ invoice: invoice._id })
        .select('method amount currency status mpesaReceipt providerRef createdAt')
        .sort({ createdAt: -1 })
        .lean();

    return sendSuccess(res, { payments });
});

module.exports = {
    getInvoiceByNumber,
    getInvoiceStatus,
    getInvoicePayments,
};