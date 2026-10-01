const AuditLog = require('../models/admin/AuditLog');
const logger = require('./logger');

const log = async ({
    tenantId = null,
    userId = null,
    userModel = null,
    action,
    module,
    resource = null,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
}) => {
    if (!action || !module) {
        logger.warn('auditService.log called without action/module');
        return null;
    }

    try {
        return await AuditLog.create({
            tenantId,
            userId,
            userModel,
            action,
            module,
            resource,
            resourceId,
            details,
            ipAddress,
            userAgent,
        });
    } catch (err) {
        logger.error('Audit log failed:', err.message, { action, module });
        return null;
    }
};

const logFromReq = async (req, data) => {
    return log({
        ...data,
        ipAddress: data.ipAddress || req.ip,
        userAgent: data.userAgent || req.headers['user-agent'],
    });
};

module.exports = { log, logFromReq };