const mongoose = require('mongoose');
const Download = require('../../models/admin/Download');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const ALLOWED_TYPES = ['windows', 'macos', 'linux', 'android', 'ios'];
const ALLOWED_ARCHS = ['x64', 'arm64', 'x86', 'universal'];

const isValidUrl = (val) => {
    if (!val) return false;
    try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
};

const getAll = asyncHandler(async (req, res) => {
    const { type, enabled, search } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { version: { $regex: search, $options: 'i' } },
        ];
    }

    const downloads = await Download.find(filter)
        .sort({ position: 1, createdAt: -1 })
        .lean();

    const normalized = downloads.map((d) => ({
        ...d,
        id: d._id.toString(),
        _id: undefined,
    }));

    return sendSuccess(res, normalized);
});

const getById = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, 'Invalid download ID', 'INVALID_ID');
    }

    const download = await Download.findById(req.params.id).lean();
    if (!download) throw new ApiError(404, 'Download not found', 'DOWNLOAD_NOT_FOUND');

    return sendSuccess(res, {
        ...download,
        id: download._id.toString(),
        _id: undefined,
    });
});

const create = asyncHandler(async (req, res) => {
    const {
        name,
        type = 'windows',
        version,
        arch = 'x64',
        link,
        size = '',
        minOS = '',
        releaseNotes = '',
        enabled = true,
        position = 0,
    } = req.body;

    if (!name || !String(name).trim()) {
        return sendError(res, 'Name is required', 400);
    }
    if (!version || !String(version).trim()) {
        return sendError(res, 'Version is required', 400);
    }
    if (!link || !String(link).trim()) {
        return sendError(res, 'URL is required', 400);
    }
    if (!isValidUrl(link)) {
        return sendError(res, 'URL must be a valid http(s) address', 400);
    }
    if (!ALLOWED_TYPES.includes(type)) {
        return sendError(res, `Type must be one of: ${ALLOWED_TYPES.join(', ')}`, 400);
    }
    if (!ALLOWED_ARCHS.includes(arch)) {
        return sendError(res, `Arch must be one of: ${ALLOWED_ARCHS.join(', ')}`, 400);
    }

    const download = await Download.create({
        name: String(name).trim(),
        type,
        version: String(version).trim(),
        arch,
        link: String(link).trim(),
        size: String(size || '').trim(),
        minOS: String(minOS || '').trim(),
        releaseNotes: String(releaseNotes || '').trim(),
        enabled: !!enabled,
        position: Number(position) || 0,
        createdBy: req.admin?._id || null,
    });

    await AuditLog.create({
        userId: req.admin?._id,
        userModel: 'Admin',
        action: 'download.created',
        module: 'admin',
        resource: 'Download',
        resourceId: download._id,
        details: { name: download.name, version: download.version, type: download.type },
    });

    return sendSuccess(
        res,
        { ...download.toObject(), id: download._id.toString(), _id: undefined },
        'Download added',
        201
    );
});

const update = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, 'Invalid download ID', 'INVALID_ID');
    }

    const download = await Download.findById(req.params.id);
    if (!download) throw new ApiError(404, 'Download not found', 'DOWNLOAD_NOT_FOUND');

    const {
        name,
        type,
        version,
        arch,
        link,
        size,
        minOS,
        releaseNotes,
        enabled,
        position,
    } = req.body;

    if (name !== undefined) {
        if (!String(name).trim()) return sendError(res, 'Name cannot be empty', 400);
        download.name = String(name).trim();
    }
    if (type !== undefined) {
        if (!ALLOWED_TYPES.includes(type)) {
            return sendError(res, `Type must be one of: ${ALLOWED_TYPES.join(', ')}`, 400);
        }
        download.type = type;
    }
    if (version !== undefined) {
        if (!String(version).trim()) return sendError(res, 'Version cannot be empty', 400);
        download.version = String(version).trim();
    }
    if (arch !== undefined) {
        if (!ALLOWED_ARCHS.includes(arch)) {
            return sendError(res, `Arch must be one of: ${ALLOWED_ARCHS.join(', ')}`, 400);
        }
        download.arch = arch;
    }
    if (link !== undefined) {
        if (!isValidUrl(link)) {
            return sendError(res, 'URL must be a valid http(s) address', 400);
        }
        download.link = String(link).trim();
    }
    if (size !== undefined) download.size = String(size || '').trim();
    if (minOS !== undefined) download.minOS = String(minOS || '').trim();
    if (releaseNotes !== undefined) download.releaseNotes = String(releaseNotes || '').trim();
    if (enabled !== undefined) download.enabled = !!enabled;
    if (position !== undefined) download.position = Number(position) || 0;

    await download.save();

    await AuditLog.create({
        userId: req.admin?._id,
        userModel: 'Admin',
        action: 'download.updated',
        module: 'admin',
        resource: 'Download',
        resourceId: download._id,
        details: { name: download.name, version: download.version, type: download.type },
    });

    return sendSuccess(
        res,
        { ...download.toObject(), id: download._id.toString(), _id: undefined },
        'Download updated'
    );
});

const toggle = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, 'Invalid download ID', 'INVALID_ID');
    }

    const download = await Download.findById(req.params.id);
    if (!download) throw new ApiError(404, 'Download not found', 'DOWNLOAD_NOT_FOUND');

    download.enabled = !download.enabled;
    await download.save();

    await AuditLog.create({
        userId: req.admin?._id,
        userModel: 'Admin',
        action: download.enabled ? 'download.enabled' : 'download.disabled',
        module: 'admin',
        resource: 'Download',
        resourceId: download._id,
        details: { name: download.name, version: download.version },
    });

    return sendSuccess(
        res,
        { ...download.toObject(), id: download._id.toString(), _id: undefined },
        download.enabled ? 'Download enabled' : 'Download disabled'
    );
});

const remove = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, 'Invalid download ID', 'INVALID_ID');
    }

    const download = await Download.findByIdAndDelete(req.params.id);
    if (!download) throw new ApiError(404, 'Download not found', 'DOWNLOAD_NOT_FOUND');

    await AuditLog.create({
        userId: req.admin?._id,
        userModel: 'Admin',
        action: 'download.deleted',
        module: 'admin',
        resource: 'Download',
        resourceId: download._id,
        details: { name: download.name, version: download.version, type: download.type },
    });

    return sendSuccess(res, null, 'Download deleted');
});

module.exports = {
    getAll,
    getById,
    create,
    update,
    toggle,
    remove,
};