import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/** `packages/server/src` → `packages/server` → `packages` → monorepo root (same as load-dotenv). */
function monorepoRoot(): string {
  const srcDir = path.dirname(fileURLToPath(import.meta.url));
  const serverRoot = path.join(srcDir, '..');
  return path.join(serverRoot, '..', '..');
}

function defaultLogDir(): string {
  return path.join(monorepoRoot(), 'logs');
}

function resolveLogDir(): string {
  const raw = process.env.LOG_DIR?.trim();
  if (!raw) return defaultLogDir();
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(process.cwd(), raw);
}

function buildLogger(): winston.Logger {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');
  const skipFile = process.env.VITEST === 'true' || process.env.LOG_TO_FILE === 'false';

  const timestamp = winston.format.timestamp();
  const jsonLine = winston.format.combine(timestamp, winston.format.json());

  const consoleFormat = isProd
    ? jsonLine
    : winston.format.combine(
        timestamp,
        winston.format.colorize({ level: true }),
        winston.format.printf((info) => {
          const { level, message, timestamp: ts, ...meta } = info;
          const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${String(ts)} ${level}: ${String(message)}${rest}`;
        }),
      );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level,
      format: consoleFormat,
    }),
  ];

  if (!skipFile) {
    const dirname = resolveLogDir();
    fs.mkdirSync(dirname, { recursive: true });
    const maxSize = process.env.LOG_MAX_SIZE ?? '20m';
    const maxFiles = process.env.LOG_MAX_FILES ?? '14d';
    transports.push(
      new DailyRotateFile({
        dirname,
        filename: 'sproutly-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles,
        zippedArchive: process.env.LOG_ZIP_ARCHIVE === 'true',
        level,
        format: jsonLine,
      }),
    );
  }

  return winston.createLogger({
    level,
    transports,
    silent: process.env.LOG_SILENT === 'true',
  });
}

export const logger = buildLogger();

/** Test hook: inspect configured transports. */
export function getLoggerTransportTypes(): string[] {
  return logger.transports.map((t) => t.constructor.name);
}
