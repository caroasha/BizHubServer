const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    type: {
        type: String,
        required: [true, 'Platform type is required'],
        enum: ['windows', 'macos', 'linux', 'android', 'ios'],
        default: 'windows',
    },
    version: {
        type: String,
        required: [true, 'Version is required'],
        trim: true,
        maxlength: [40, 'Version cannot exceed 40 characters'],
    },
    arch: {
        type: String,
        enum: ['x64', 'arm64', 'x86', 'universal'],
        default: 'x64',
    },
    link: {
        type: String,
        required: [true, 'URL is required'],
        trim: true,
    },
    size: {
        type: String,
        trim: true,
        default: '',
    },
    minOS: {
        type: String,
        trim: true,
        default: '',
    },
    releaseNotes: {
        type: String,
        trim: true,
        default: '',
    },
    enabled: {
        type: Boolean,
        default: true,
        index: true,
    },
    position: {
        type: Number,
        default: 0,
    },
    downloads: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
}, {
    timestamps: true,
});

downloadSchema.index({ type: 1, enabled: 1 });
downloadSchema.index({ position: 1, createdAt: -1 });

downloadSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('Download', downloadSchema);