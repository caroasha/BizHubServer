const os = require('os');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const env = require('../../config/env');
const { getRedisClient } = require('../../config/redis');

const OK_STATES = ['up', 'enabled', 'connected', 'healthy', 'running'];

const formatUptime = (seconds) => {
    const s = Math.floor(seconds);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
};

const maskEmail = (email) => {
    if (!email) return null;
    return String(email).replace(/^(.{2}).*(@.*)$/, '$1•••$2');
};

/* ─── SERVER ───────────────────────────────────────────── */
const getServer = () => {
    const mem = process.memoryUsage();
    const cpus = os.cpus();

    return {
        status: 'running',
        node: process.version,
        platform: `${os.platform()} ${os.release()}`,
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: process.uptime(),
        uptimeHuman: formatUptime(process.uptime()),
        cpuCores: cpus.length,
        cpuModel: cpus[0]?.model || 'Unknown',
        memoryRssMb: Math.round(mem.rss / 1024 / 1024),
        memoryHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        memoryHeapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
        pid: process.pid,
        env: env.NODE_ENV,
        timezone: env.APP_TIMEZONE,
    };
};

/* ─── DATABASE ─────────────────────────────────────────── */
const getDatabase = async () => {
    try {
        const state = mongoose.connection.readyState;
        const stateMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };

        if (state !== 1) {
            return {
                status: stateMap[state] || 'unknown',
                type: 'mongodb',
                host: null,
                database: null,
                collections: 0,
                documents: 0,
            };
        }

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        let totalDocuments = 0;
        const collectionStats = [];

        for (const col of collections) {
            try {
                const count = await db.collection(col.name).countDocuments();
                totalDocuments += count;
                collectionStats.push({ name: col.name, count });
            } catch {
                /* skip */
            }
        }

        collectionStats.sort((a, b) => b.count - a.count);

        return {
            status: 'connected',
            type: 'mongodb',
            host: mongoose.connection.host,
            database: mongoose.connection.name,
            collections: collections.length,
            documents: totalDocuments,
            topCollections: collectionStats.slice(0, 5),
        };
    } catch (err) {
        return {
            status: 'error',
            type: 'mongodb',
            error: err.message,
        };
    }
};

/* ─── REDIS ────────────────────────────────────────────── */
const getRedis = async () => {
    if (!env.REDIS_ENABLED) {
        return {
            status: 'disabled',
            enabled: false,
            host: null,
        };
    }

    try {
        const redis = getRedisClient();
        if (!redis) {
            return { status: 'disconnected', enabled: true, host: null };
        }

        const start = Date.now();
        await redis.ping();
        const latencyMs = Date.now() - start;

        let host = null;
        try {
            const url = new URL(env.REDIS_URL);
            host = `${url.hostname}:${url.port || 6379}`;
        } catch {
            host = env.REDIS_URL || null;
        }

        return {
            status: redis.status === 'ready' ? 'connected' : 'connecting',
            enabled: true,
            host,
            latencyMs,
        };
    } catch (err) {
        return {
            status: 'error',
            enabled: true,
            error: err.message,
        };
    }
};

/* ─── EMAIL ────────────────────────────────────────────── */
const getEmail = () => {
    const provider = env.EMAIL_PROVIDER || 'hdmBridge';
    const from = env.HDM_FROM_EMAIL || 'noreply@bizhub.co.ke';

    let status = 'enabled';
    if (provider === 'brevo' && !env.BREVO_API_KEY) status = 'misconfigured';
    if (provider === 'hdmBridge' && !env.HDM_API_KEY) status = 'misconfigured';

    return {
        status,
        provider,
        from,
        fromMasked: maskEmail(from),
    };
};

/* ─── SMS ──────────────────────────────────────────────── */
const getSms = () => {
    const provider = env.SMS_PROVIDER || 'hdmBridge';

    let status = 'enabled';
    if (provider === 'brevo' && !env.BREVO_API_KEY) status = 'misconfigured';
    if (provider === 'hdmBridge' && !env.HDM_API_KEY) status = 'misconfigured';

    return {
        status,
        provider,
        sender: env.APP_NAME || 'BizHub',
    };
};

/* ─── STORAGE ──────────────────────────────────────────── */
const getStorage = () => {
    const provider = env.STORAGE_PROVIDER || 'local';
    const isCloud = provider === 'cloudinary';

    let status = 'enabled';
    if (isCloud && (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY)) {
        status = 'misconfigured';
    }

    return {
        status,
        type: provider,
        cloud: isCloud ? 'cloudinary' : 'local',
        maxUploadMb: env.UPLOAD_MAX_SIZE_MB || 10,
    };
};

/* ─── BACKUPS ──────────────────────────────────────────── */
const getBackups = () => {
    try {
        const BACKUP_DIR = path.resolve(__dirname, '../../backups');

        if (!fs.existsSync(BACKUP_DIR)) {
            return {
                status: 'enabled',
                type: 'filesystem',
                count: 0,
                lastBackupAt: null,
                lastBackupSize: null,
            };
        }

        const files = fs
            .readdirSync(BACKUP_DIR)
            .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
            .map((f) => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    createdAt: stats.birthtime,
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            status: 'enabled',
            type: 'filesystem',
            count: files.length,
            lastBackupAt: files[0]?.createdAt || null,
            lastBackupSize: files[0]?.size || null,
        };
    } catch (err) {
        return {
            status: 'error',
            type: 'filesystem',
            count: 0,
            error: err.message,
        };
    }
};

/* ─── MPESA ────────────────────────────────────────────── */
const getMpesa = () => {
    const configured = !!(
        env.MPESA_CONSUMER_KEY &&
        env.MPESA_CONSUMER_SECRET &&
        env.MPESA_SHORTCODE &&
        env.MPESA_PASSKEY
    );

    return {
        status: configured ? 'enabled' : 'misconfigured',
        environment: env.MPESA_ENVIRONMENT || 'sandbox',
        shortCode: env.MPESA_SHORTCODE ? `••••${String(env.MPESA_SHORTCODE).slice(-3)}` : null,
        callbackUrl: env.MPESA_CALLBACK_URL || env.MPESA_CALLBACK_BASE_URL || null,
        transactionType: env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
    };
};

/* ─── AI ───────────────────────────────────────────────── */
const getAi = () => {
    const hasKey = !!(env.HDM_AI_API_KEY);
    return {
        status: hasKey ? 'enabled' : 'disabled',
        baseUrl: env.HDM_AI_BASE_URL || null,
    };
};

/* ─── MAIN HANDLER ─────────────────────────────────────── */
const getHealth = asyncHandler(async (req, res) => {
    const start = Date.now();

    const [database, redis] = await Promise.all([
        getDatabase(),
        getRedis(),
    ]);

    const server = getServer();
    const email = getEmail();
    const sms = getSms();
    const storage = getStorage();
    const backups = getBackups();
    const mpesa = getMpesa();
    const ai = getAi();

    const services = { server, database, redis, email, sms, storage, backups, mpesa, ai };

    const total = Object.keys(services).length;
    const up = Object.values(services).filter((s) => OK_STATES.includes(s.status)).length;
    const degraded = Object.values(services).filter(
        (s) => s.status === 'disabled' || s.status === 'misconfigured'
    ).length;
    const down = total - up - degraded;

    const health = {
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        overall: {
            status: down > 0 ? 'degraded' : degraded > 0 ? 'partial' : 'healthy',
            up,
            degraded,
            down,
            total,
        },
        server,
        database,
        redis,
        email,
        sms,
        storage,
        backups,
        mpesa,
        ai,
        cors: env.CORS_ORIGINS || [],
        version: env.APP_VERSION || '1.0.0',
        environment: env.NODE_ENV,
    };

    return sendSuccess(res, health);
});

module.exports = { getHealth };