import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Never log PII — only IDs
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// Log complaint status transitions (structured)
export function logStatusTransition(params: {
  complaintId: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string;
}) {
  logger.info('complaint.status_transition', {
    event: 'status_transition',
    complaint_id: params.complaintId,
    from_status: params.fromStatus,
    to_status: params.toStatus,
    changed_by: params.changedById,
    timestamp: new Date().toISOString(),
  });
}
