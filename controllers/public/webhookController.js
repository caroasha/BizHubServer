const Payment = require('../../models/admin/Payment');
const Invoice = require('../../models/admin/Invoice');
const Tenant = require('../../models/admin/Tenant');
const PendingApproval = require('../../models/admin/PendingApproval');
const Admin = require('../../models/admin/Admin');
const mpesaService = require('../../services/mpesaService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const auditService = require('../../utils/auditService');
const asyncHandler = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const USER_MODEL_MAP = {
    restaurant: '../../models/resto/User',
    pharmacy: '../../models/pharma/User',
    apartment: '../../models/apartment/User',
    electronics: '../../models/electro/User',
    cyber: '../../models/cyber/User',
};

const getUserModel = (businessType) => {
    const path = USER_MODEL_MAP[businessType];
    if (!path) return null;
    return require(path);
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return (req.ip || req.connection?.remoteAddress || '').replace('::ffff:', '');
};

const findInvoiceForPayment = async (payment, checkoutRequestId) => {
    if (payment.invoice) {
        const inv = await Invoice.findById(payment.invoice);
        if (inv) return inv;
    }
    return Invoice.findOne({ 'stkLastRequest.checkoutRequestId': checkoutRequestId });
};

const handleSuccess = async (payment, parsed) => {
    const invoice = await findInvoiceForPayment(payment, parsed.checkoutRequestId);
    if (!invoice) {
        logger.warn('M-Pesa callback: invoice not found', {
            checkoutRequestId: parsed.checkoutRequestId,
        });
        return;
    }

    if (invoice.status === 'paid') {
        logger.info('Invoice already paid — skipping', {
            invoiceNumber: invoice.invoiceNumber,
        });
        return;
    }

    const paidAmount = parsed.amount || invoice.amountDue;

    invoice.status = 'paid';
    invoice.paymentState = 'paid';
    invoice.amountPaid = paidAmount;
    invoice.amountDue = 0;
    invoice.paidAt = new Date();
    invoice.paymentMethod = 'mpesa_stk';
    invoice.paymentRef = parsed.mpesaReceiptNumber || null;
    await invoice.save();

    const tenant = await Tenant.findById(invoice.tenantId);
    if (tenant) {
        tenant.paymentReceived = true;
        tenant.paymentReceivedAt = new Date();
        await tenant.save();
    }

    let user = null;
    if (tenant) {
        const User = getUserModel(tenant.businessType);
        if (User) {
            try {
                user = await User.findById(invoice.user);
                if (user) {
                    user.scope = 'paid_wait';
                    user.scopeChangedAt = new Date();
                    user.scopeReason = 'payment_received';
                    user.paymentStatus = 'paid';
                    user.paymentMethod = 'mpesa_stk';
                    user.paymentReference = parsed.mpesaReceiptNumber || null;
                    user.paymentDate = new Date();
                    await user.save();
                }
            } catch (err) {
                logger.error('Failed to update user scope:', err.message);
            }
        }
    }

    await PendingApproval.findOneAndUpdate(
        { invoice: invoice._id, status: 'pending' },
        { paymentReceived: true, paymentReceivedAt: new Date() }
    );

    if (tenant && user) {
        Promise.resolve().then(async () => {
            try {
                await emailService.sendTemplate('tenantPaymentReceived', user.email, {
                    name: user.name,
                    businessName: tenant.businessName,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: paidAmount,
                    currency: invoice.currency,
                    paymentMethod: 'mpesa_stk',
                    paymentReference: parsed.mpesaReceiptNumber,
                    paidAt: new Date(),
                });
            } catch (err) {
                logger.error('Payment email failed:', err.message);
            }

            try {
                await smsService.sendTemplate('tenantPaymentReceived', user.phone, {
                    name: user.name,
                    businessName: tenant.businessName,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: paidAmount,
                });
            } catch (err) {
                logger.error('Payment SMS failed:', err.message);
            }
        }).catch(() => {});

        Promise.resolve().then(async () => {
            try {
                const admins = await Admin.find({ isActive: true }).lean();
                await Promise.allSettled(admins.map((admin) =>
                    emailService.sendTemplate('adminPaymentReceived', admin.email, {
                        businessName: tenant.businessName,
                        ownerName: tenant.owner?.name || '',
                        ownerEmail: tenant.owner?.email || '',
                        ownerPhone: tenant.owner?.phone || '',
                        planName: tenant.settings?.planName || '',
                        amount: paidAmount,
                        currency: invoice.currency,
                        invoiceNumber: invoice.invoiceNumber,
                        paymentMethod: 'mpesa_stk',
                        reference: parsed.mpesaReceiptNumber,
                    })
                ));
            } catch (err) {
                logger.error('Admin notify failed:', err.message);
            }
        }).catch(() => {});
    }

    await auditService.log({
        tenantId: invoice.tenantId,
        userId: invoice.user,
        userModel: invoice.userModel || null,
        action: 'payment.received',
        module: 'admin',
        resource: 'Invoice',
        resourceId: invoice._id,
        details: {
            invoiceNumber: invoice.invoiceNumber,
            amount: paidAmount,
            receipt: parsed.mpesaReceiptNumber,
            method: 'mpesa_stk',
        },
    });
};

const handleFailure = async (payment, parsed) => {
    const invoice = await findInvoiceForPayment(payment, parsed.checkoutRequestId);
    if (!invoice) {
        logger.warn('M-Pesa callback (failure): invoice not found', {
            checkoutRequestId: parsed.checkoutRequestId,
        });
        return;
    }

    invoice.paymentState = 'failed';
    invoice.paymentMethod = 'mpesa_stk';
    invoice.paymentRef = parsed.resultDesc || 'Failed';
    await invoice.save();
};

const processCallback = async (payload, parsed) => {
    try {
        const payment = await Payment.findOne({
            $or: [
                { checkoutRequestId: parsed.checkoutRequestId },
                { providerRef: parsed.checkoutRequestId },
            ],
        });

        if (!payment) {
            logger.warn('Payment not found for callback', {
                checkoutRequestId: parsed.checkoutRequestId,
            });
            return;
        }

        if (payment.status === 'success') {
            logger.info('Payment already processed', { paymentId: payment._id });
            return;
        }

        payment.status = parsed.success ? 'success' : 'failed';
        payment.providerPayload = payload;
        if (parsed.success && parsed.mpesaReceiptNumber) {
            payment.mpesaReceipt = parsed.mpesaReceiptNumber;
            payment.providerRef = parsed.mpesaReceiptNumber;
        }
        await payment.save();

        if (parsed.success) {
            await handleSuccess(payment, parsed);
        } else {
            await handleFailure(payment, parsed);
        }
    } catch (err) {
        logger.error('Callback processing failed', {
            error: err.message,
            checkoutRequestId: parsed?.checkoutRequestId,
        });
    }
};

const mpesaCallback = asyncHandler(async (req, res) => {
    const payload = req.body;
    const clientIp = getClientIp(req);
    const checkoutRequestId = payload?.Body?.stkCallback?.CheckoutRequestID;

    logger.info('M-Pesa callback received', {
        checkoutRequestId,
        resultCode: payload?.Body?.stkCallback?.ResultCode,
        ip: clientIp,
    });

    if (!checkoutRequestId) {
        logger.warn('Callback without checkoutRequestId — rejecting', { ip: clientIp });
        return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid' });
    }

    // Authenticity gate: the CheckoutRequestID must match a Payment we
    // initiated when we sent the STK Push. Anything else is rejected.
    const known = await Payment.exists({
        $or: [
            { checkoutRequestId },
            { providerRef: checkoutRequestId },
        ],
    });

    if (!known) {
        logger.warn('Callback rejected — unknown CheckoutRequestID', {
            checkoutRequestId,
            ip: clientIp,
        });
        return res.status(403).json({ ResultCode: 1, ResultDesc: 'Unknown transaction' });
    }

    // Acknowledge Safaricom immediately (must be < 5s).
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (mpesaService.isDuplicateCallback(checkoutRequestId)) {
        logger.info('Duplicate callback (memory dedupe)', { checkoutRequestId });
        return;
    }

    // Process asynchronously so we don't block Safaricom's HTTP client.
    setImmediate(() => {
        processCallback(payload, mpesaService.parseCallback(payload)).catch((err) =>
            logger.error('processCallback threw', {
                error: err.message,
                checkoutRequestId,
            })
        );
    });
});

const mpesaTimeout = asyncHandler(async (req, res) => {
    logger.warn('M-Pesa callback timeout', req.body);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = {
    mpesaCallback,
    mpesaTimeout,
};