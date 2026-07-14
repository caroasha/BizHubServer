const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const env = require('../config/env');

const transports = [];

if (env.LOG_TO_CONSOLE) {
  transports.push(
    new winston.transports.Console({
      level: env.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // Sanitize: remove tokens, passwords, API keys from logs
          let msg = message;
          if (typeof msg === 'string') {
            msg = msg
              .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [REDACTED]')
              .replace(/"password":\s*"[^"]*"/g, '"password":"[REDACTED]"')
              .replace(/"apiKey":\s*"[^"]*"/g, '"apiKey":"[REDACTED]"')
              .replace(/"accessToken":\s*"[^"]*"/g, '"accessToken":"[REDACTED]"')
              .replace(/"refreshToken":\s*"[^"]*"/g, '"refreshToken":"[REDACTED]"');
          }
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${msg} ${metaStr}`;
        })
      ),
    })
  );
}

if (env.LOG_TO_FILE) {
  transports.push(
    new winston.transports.DailyRotateFile({
      level: env.LOG_LEVEL,
      dirname: env.LOG_FILE_PATH || './logs',
      filename: 'bizhub-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: `${env.LOG_MAX_FILE_SIZE_MB || 10}m`,
      maxFiles: env.LOG_MAX_FILES || 30,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );

  // Separate error log
  transports.push(
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: env.LOG_FILE_PATH || './logs',
      filename: 'bizhub-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: 30,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
  exitOnError: false,
});

// Morgan stream integration
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;