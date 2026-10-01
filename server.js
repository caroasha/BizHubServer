require('./scripts/dnsSet');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

const env = require('./config/env');
const connectDB = require('./config/database');
const { connectRedis, getRedisClient } = require('./config/redis');
const { configureCloudinary } = require('./config/cloudinary');
const { initSocket } = require('./config/socket');

const errorHandler = require('./middleware/global/errorHandler');
const maintenance = require('./middleware/global/maintenance');
const { generalLimiter } = require('./middleware/global/rateLimiter');

const startSchedulers = require('./schedulers/index');
const logger = require('./utils/logger');
const { sendSuccess } = require('./utils/response');

const app = express();
const server = http.createServer(app);

/* ============================================================
 * ANSI PALETTE
 * ============================================================ */
const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;
const BLINK = `${ESC}5m`;

const FG = {
    black: `${ESC}30m`,
    red: `${ESC}31m`,
    green: `${ESC}32m`,
    yellow: `${ESC}33m`,
    blue: `${ESC}34m`,
    magenta: `${ESC}35m`,
    cyan: `${ESC}36m`,
    white: `${ESC}37m`,
    gray: `${ESC}90m`,
    brightRed: `${ESC}91m`,
    brightGreen: `${ESC}92m`,
    brightYellow: `${ESC}93m`,
    brightBlue: `${ESC}94m`,
    brightMagenta: `${ESC}95m`,
    brightCyan: `${ESC}96m`,
    brightWhite: `${ESC}97m`,
};

const BG = {
    black: `${ESC}40m`,
    red: `${ESC}41m`,
    green: `${ESC}42m`,
    yellow: `${ESC}43m`,
    blue: `${ESC}44m`,
    magenta: `${ESC}45m`,
    cyan: `${ESC}46m`,
    white: `${ESC}47m`,
    gray: `${ESC}100m`,
    brightRed: `${ESC}101m`,
    brightGreen: `${ESC}102m`,
    brightYellow: `${ESC}103m`,
    brightBlue: `${ESC}104m`,
    brightMagenta: `${ESC}105m`,
    brightCyan: `${ESC}106m`,
};

const c = (fg, bg, text) => `${fg || ''}${bg || ''}${text}${RESET}`;
const bold = (t) => `${BOLD}${t}${RESET}`;
const dim = (t) => `${DIM}${t}${RESET}`;

/* ============================================================
 * BOX DRAWING
 * ============================================================ */
const W = 68;
const box = {
    tl: '╔', tr: '╗', bl: '╚', br: '╝',
    h: '═', v: '║',
    ml: '╠', mr: '╣',
    hLight: '─',
    dot: '·',
};

const padRight = (str, len) => {
    const visible = str.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, len - visible.length);
    return str + ' '.repeat(pad);
};

const center = (str, len) => {
    const visible = str.replace(/\x1b\[[0-9;]*m/g, '');
    const total = Math.max(0, len - visible.length);
    const left = Math.floor(total / 2);
    const right = total - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
};

const line = (char = box.h) => char.repeat(W - 2);

const header = (title) =>
    c(FG.brightCyan, BG.black, box.tl + line() + box.tr) + '\n' +
    c(FG.brightCyan, BG.black, box.v) + center(bold(title), W - 2) + c(FG.brightCyan, BG.black, box.v) + '\n' +
    c(FG.brightCyan, BG.black, box.ml + line() + box.mr);

const footer = () =>
    c(FG.brightCyan, BG.black, box.bl + line() + box.br);

const row = (label, value) =>
    c(FG.brightCyan, BG.black, box.v) + ' ' +
    padRight(label, 22) +
    value +
    c(FG.brightCyan, BG.black, box.v);

/* ============================================================
 * BOOT BANNER
 * ============================================================ */
const printBanner = () => {
    const version = env.APP_VERSION || '1.0.0';
    const mode = env.NODE_ENV.toUpperCase();

    console.log('');
    console.log(c(FG.brightCyan, null, '  ' + box.tl + line() + box.tr));
    console.log(c(FG.brightCyan, null, '  ' + box.v) + center('', W - 2) + c(FG.brightCyan, null, box.v));
    console.log(c(FG.brightCyan, null, '  ' + box.v) +
        center(c(FG.brightWhite, null, bold('B I Z H U B')), W - 2) +
        c(FG.brightCyan, null, box.v));
    console.log(c(FG.brightCyan, null, '  ' + box.v) +
        center(c(FG.cyan, null, 'Universal Business Management Suite'), W - 2) +
        c(FG.brightCyan, null, box.v));
    console.log(c(FG.brightCyan, null, '  ' + box.v) +
        center(c(FG.gray, null, `v${version}  ·  ${mode}`), W - 2) +
        c(FG.brightCyan, null, box.v));
    console.log(c(FG.brightCyan, null, '  ' + box.v) + center('', W - 2) + c(FG.brightCyan, null, box.v));
    console.log(c(FG.brightCyan, null, '  ' + box.bl + line() + box.br));
    console.log('');
};

/* ============================================================
 * STATUS PRINTER
 * ============================================================ */
const ICONS = {
    ok: c(FG.brightGreen, null, '✓'),
    fail: c(FG.brightRed, null, '✗'),
    warn: c(FG.brightYellow, null, '⚠'),
    info: c(FG.brightCyan, null, 'ℹ'),
    loading: c(FG.brightYellow, null, '⟳'),
    bullet: c(FG.gray, null, '•'),
    arrow: c(FG.gray, null, '→'),
};

const printStatus = (icon, label, message, extra = '') => {
    const paddedLabel = padRight(label, 14);
    const dots = c(FG.gray, null, ' ' + box.dot.repeat(Math.max(2, 26 - label.length)) + ' ');
    console.log(
        '  ' +
        icon + ' ' +
        c(FG.white, null, paddedLabel) +
        dots +
        message +
        (extra ? ' ' + c(FG.gray, null, extra) : '')
    );
};

/* ============================================================
 * BOOT CHECKLIST
 * ============================================================ */
const checks = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
};

const check = (name, status, message, extra = '') => {
    checks.total++;
    if (status === 'ok') {
        checks.passed++;
        printStatus(ICONS.ok, name, c(FG.brightGreen, null, message), extra);
    } else if (status === 'warn') {
        checks.warnings++;
        printStatus(ICONS.warn, name, c(FG.brightYellow, null, message), extra);
    } else if (status === 'fail') {
        checks.failed++;
        printStatus(ICONS.fail, name, c(FG.brightRed, null, message), extra);
    } else {
        printStatus(ICONS.info, name, c(FG.brightCyan, null, message), extra);
    }
};

/* ============================================================
 * EXPRESS MIDDLEWARE
 * ============================================================ */
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(generalLimiter);
app.use(maintenance);

if (env.isProduction()) {
    app.set('trust proxy', 1);
    app.use(morgan('combined', { stream: logger.stream }));
} else {
    app.use(morgan('dev'));
}

/* ============================================================
 * HEALTH & INFO
 * ============================================================ */
app.get('/', (req, res) => sendSuccess(res, {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
    timezone: env.APP_TIMEZONE,
    timestamp: new Date().toISOString(),
}, `${env.APP_NAME} is running`));

app.get('/api', (req, res) => sendSuccess(res, {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    description: env.APP_DESCRIPTION,
    prefix: env.API_PREFIX,
    time: new Date().toISOString(),
}, 'API Information'));

app.get('/health', async (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        status: 'healthy',
        services: {
            server: 'up',
            database: 'unknown',
            redis: env.REDIS_ENABLED ? 'unknown' : 'disabled',
        },
    };

    try {
        health.services.database = mongoose.connection.readyState === 1 ? 'up' : 'down';
    } catch {
        health.services.database = 'down';
    }

    if (env.REDIS_ENABLED) {
        try {
            const redis = getRedisClient();
            health.services.redis = redis?.status === 'ready' ? 'up' : 'down';
        } catch {
            health.services.redis = 'down';
        }
    }

    const allUp = Object.values(health.services).every((s) => s === 'up' || s === 'disabled');
    health.status = allUp ? 'healthy' : 'degraded';
    res.status(allUp ? 200 : 503).json({ success: allUp, data: health });
});

/* ============================================================
 * ROUTES
 * ============================================================ */
app.use(env.API_PREFIX, require('./routes/index'));

app.use((req, res) => res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: 'NOT_FOUND',
}));

app.use(errorHandler);

/* ============================================================
 * STARTUP
 * ============================================================ */
const start = async () => {
    const startTime = Date.now();

    printBanner();

    console.log('  ' + c(FG.brightCyan, null, 'INITIALIZING'));
    console.log('  ' + c(FG.gray, null, box.hLight.repeat(W - 6)));
    console.log('');

    logger.info(`Starting ${env.APP_NAME} v${env.APP_VERSION} in ${env.NODE_ENV} mode`);

    // ─── Database ────────────────────────────────
    try {
        const dbConn = await connectDB();
        const dbName = dbConn.connection.name;
        const dbHost = dbConn.connection.host;
        check('Database', 'ok', c(FG.brightGreen, null, 'MongoDB connected'),
            c(FG.gray, null, `${dbHost}/${dbName}`));
    } catch (err) {
        check('Database', 'fail', c(FG.brightRed, null, 'MongoDB failed'),
            c(FG.gray, null, err.message));
        throw err;
    }

    // ─── Redis ───────────────────────────────────
    if (env.REDIS_ENABLED) {
        try {
            const redis = connectRedis();
            if (redis) {
                try {
                    await redis.ping();
                    check('Cache', 'ok', c(FG.brightGreen, null, 'Redis connected'),
                        c(FG.gray, null, env.REDIS_URL));
                } catch {
                    check('Cache', 'warn', c(FG.brightYellow, null, 'Redis connecting'),
                        c(FG.gray, null, env.REDIS_URL));
                }
            }
        } catch (err) {
            check('Cache', 'warn', c(FG.brightYellow, null, 'Redis unavailable'),
                c(FG.gray, null, err.message));
        }
    } else {
        check('Cache', 'info', c(FG.gray, null, 'Redis disabled'));
    }

    // ─── Storage ─────────────────────────────────
    if (env.STORAGE_PROVIDER === 'cloudinary') {
        try {
            configureCloudinary();
            check('Storage', 'ok', c(FG.brightGreen, null, 'Cloudinary configured'));
        } catch (err) {
            check('Storage', 'warn', c(FG.brightYellow, null, 'Cloudinary failed'),
                c(FG.gray, null, err.message));
        }
    } else {
        check('Storage', 'info', c(FG.gray, null, 'Local storage'));
    }

    // ─── Schedulers ──────────────────────────────
    try {
        startSchedulers();
        check('Schedulers', 'ok', c(FG.brightGreen, null, 'Cron jobs registered'));
    } catch (err) {
        check('Schedulers', 'warn', c(FG.brightYellow, null, 'Scheduler failed'),
            c(FG.gray, null, err.message));
    }

    // ─── Socket.io ───────────────────────────────
    try {
        initSocket(server);
        check('Socket.io', 'ok', c(FG.brightGreen, null, 'WebSocket server ready'));
    } catch (err) {
        check('Socket.io', 'warn', c(FG.brightYellow, null, 'Socket.io failed'),
            c(FG.gray, null, err.message));
    }

    // ─── Rate limiter ────────────────────────────
    check('Rate limit', 'ok', c(FG.brightGreen, null, 'Active'),
        c(FG.gray, null, `${env.RATE_LIMIT_MAX_REQUESTS || 1000} req / ${Math.round((env.RATE_LIMIT_WINDOW_MS || 900000) / 60000)} min`));

    // ─── Environment ─────────────────────────────
    check('Environment', 'ok', c(FG.brightGreen, null, env.NODE_ENV.toUpperCase()),
        c(FG.gray, null, env.APP_TIMEZONE || 'UTC'));

    const bootMs = Date.now() - startTime;

    console.log('');

    // ─── Server listen ───────────────────────────
    server.listen(env.PORT, env.HOST, () => {
        const addr = `http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`;

        console.log('  ' + c(FG.brightGreen, null, box.hLight.repeat(W - 6)));
        console.log('');
        console.log('  ' + c(FG.bgGreen, FG.black, bold('  ONLINE  ')) + ' ' +
            c(FG.brightGreen, null, bold(`${env.APP_NAME} v${env.APP_VERSION}`)) +
            c(FG.gray, null, `  ·  boot in ${bootMs}ms`));
        console.log('');
        console.log('  ' + c(FG.gray, null, '  API      ') + c(FG.brightCyan, null, UNDERLINE + addr + env.API_PREFIX + RESET));
        console.log('  ' + c(FG.gray, null, '  Health   ') + c(FG.brightCyan, null, UNDERLINE + addr + '/health' + RESET));
        console.log('  ' + c(FG.gray, null, '  Socket   ') + c(FG.brightCyan, null, addr));
        console.log('  ' + c(FG.gray, null, '  Mode     ') + c(FG.brightYellow, null, env.NODE_ENV.toUpperCase()));
        console.log('  ' + c(FG.gray, null, '  Timezone ') + c(FG.brightWhite, null, env.APP_TIMEZONE || 'UTC'));
        console.log('');
        console.log('  ' + c(FG.brightGreen, null, box.hLight.repeat(W - 6)));
        console.log('');
        console.log('  ' + c(FG.brightGreen, null, ICONS.ok) + ' ' +
            c(FG.brightWhite, null, `${checks.passed} checks passed`) +
            (checks.warnings > 0 ? c(FG.brightYellow, null, `  ·  ${checks.warnings} warnings`) : '') +
            (checks.failed > 0 ? c(FG.brightRed, null, `  ·  ${checks.failed} failed`) : ''));
        console.log('');
        console.log('  ' + c(FG.gray, ITALIC, '  Press CTRL+C to stop'));
        console.log('');

        logger.info(`Server running on port ${env.PORT}`);
    });

    // Live clock in dev
    if (!env.isProduction()) {
        const clock = setInterval(() => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-KE', { hour12: false });
            const date = now.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
            process.stdout.write(
                `\r  ${c(FG.gray, null, '[' + date + ' ' + time + ']')} ${c(FG.brightGreen, null, '●')} ${c(FG.gray, null, 'listening on')} ${c(FG.brightCyan, null, String(env.PORT))}    `
            );
        }, 1000);

        clock.unref?.();
    }
};

/* ============================================================
 * GRACEFUL SHUTDOWN
 * ============================================================ */
const gracefulShutdown = async (signal) => {
    console.log('');
    console.log('');
    console.log('  ' + c(FG.brightYellow, null, ICONS.warn) + ' ' +
        c(FG.brightYellow, null, `${signal} received — shutting down gracefully`));
    console.log('');

    let step = 0;
    const totalSteps = 3;

    server.close(async () => {
        try {
            step++;
            printStatus(ICONS.ok, 'HTTP', c(FG.brightGreen, null, 'Server closed'),
                c(FG.gray, null, `${step}/${totalSteps}`));

            const mongoose = require('mongoose');
            await mongoose.connection.close();
            step++;
            printStatus(ICONS.ok, 'MongoDB', c(FG.brightGreen, null, 'Disconnected'),
                c(FG.gray, null, `${step}/${totalSteps}`));

            if (env.REDIS_ENABLED) {
                const redis = getRedisClient();
                if (redis) {
                    await redis.quit();
                    step++;
                    printStatus(ICONS.ok, 'Redis', c(FG.brightGreen, null, 'Disconnected'),
                        c(FG.gray, null, `${step}/${totalSteps}`));
                }
            }

            console.log('');
            console.log('  ' + c(FG.brightGreen, null, '✓ Goodbye'));
            console.log('');

            logger.info('All connections closed. Goodbye!');
            process.exit(0);
        } catch (err) {
            console.log('');
            console.log('  ' + c(FG.brightRed, null, ICONS.fail) + ' ' +
                c(FG.brightRed, null, `Shutdown error: ${err.message}`));
            logger.error('Shutdown error:', err);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.log('');
        console.log('  ' + c(FG.brightRed, null, ICONS.fail) + ' ' +
            c(FG.brightRed, null, 'Forced shutdown after 15s timeout'));
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    console.log('');
    console.log('  ' + c(FG.brightRed, null, ICONS.fail) + ' ' +
        c(FG.brightRed, null, 'Uncaught Exception: ' + error.message));
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
    console.log('');
    console.log('  ' + c(FG.brightYellow, null, ICONS.warn) + ' ' +
        c(FG.brightYellow, null, 'Unhandled Rejection: ' + (reason?.message || reason)));
    logger.error('Unhandled Rejection:', reason);
});

/* ============================================================
 * BOOT
 * ============================================================ */
start().catch((error) => {
    console.log('');
    console.log('  ' + c(FG.bgRed, FG.brightWhite, bold('  BOOT FAILED  ')));
    console.log('');
    console.log('  ' + c(FG.brightRed, null, error.message));
    console.log('');
    if (error.stack && !env.isProduction()) {
        console.log('  ' + c(FG.gray, null, error.stack.split('\n').slice(1, 6).join('\n  ')));
        console.log('');
    }
    logger.error('Failed to start server:', error);
    process.exit(1);
});

module.exports = app;