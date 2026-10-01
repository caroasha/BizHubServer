const Download = require('../../models/admin/Download');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const list = asyncHandler(async (req, res) => {
    const { type } = req.query;

    const filter = { enabled: true };
    if (type) filter.type = type;

    const downloads = await Download.find(filter)
        .sort({ position: 1, createdAt: -1 })
        .select('-releaseNotes -createdBy -__v -downloads')
        .lean();

    const normalized = downloads.map((d) => ({
        ...d,
        id: d._id.toString(),
        _id: undefined,
    }));

    return sendSuccess(res, normalized);
});

const trackAndRedirect = asyncHandler(async (req, res) => {
    const download = await Download.findOne({ _id: req.params.id, enabled: true }).lean();
    if (!download) return res.status(404).json({ success: false, message: 'Download not found' });

    Download.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }).catch(() => {});
    return res.redirect(download.link);
});

module.exports = { list, trackAndRedirect };