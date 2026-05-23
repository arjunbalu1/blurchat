import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { context, isSpanContextValid, trace } from '@opentelemetry/api';
import type { Params } from 'nestjs-pino';
import type { Options as PinoHttpOptions } from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';

// query-string keys that may carry secrets (OAuth code, verification tokens, …)
const SENSITIVE_QUERY = new Set([
  'token',
  'code',
  'access_token',
  'refresh_token',
  'id_token',
  'secret',
  'password',
  'otp',
  'jwt',
]);

// mask sensitive query params; pino redact can't reach inside a URL string
function sanitizeUrl(url?: string): string | undefined {
  if (!url || !url.includes('?')) return url;
  const [path, query] = url.split('?');
  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) {
    if (SENSITIVE_QUERY.has(key.toLowerCase())) params.set(key, '[REDACTED]');
  }
  return `${path}?${params.toString()}`;
}

const pinoHttpOptions: PinoHttpOptions = {
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),

  // app lines carry only reqId; full req/res lands once on the completion line
  quietReqLogger: true,

  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          singleLine: true,
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
        },
      },

  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["proxy-authorization"]',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },

  // surface the authenticated user (set by JwtAuthGuard) as a searchable field
  customProps(req: IncomingMessage) {
    const sub = (req as IncomingMessage & { user?: { sub?: string } }).user?.sub;
    return sub ? { userId: sub } : {};
  },

  serializers: {
    req(req: IncomingMessage) {
      return {
        method: req.method,
        url: sanitizeUrl(req.url),
        headers: req.headers,
      };
    },
    // pino-std-serializers passes a wrapped res, not a ServerResponse
    res(res: { statusCode: number }) {
      return { statusCode: res.statusCode };
    },
  },

  customLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // X-Railway-Request-Id → OTel trace_id → uuid
  genReqId(req: IncomingMessage) {
    const upstream = req.headers['x-railway-request-id'];
    if (typeof upstream === 'string') return upstream;
    const span = trace.getSpan(context.active());
    if (span) {
      const ctx = span.spanContext();
      if (isSpanContextValid(ctx)) return ctx.traceId;
    }
    return randomUUID();
  },

  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const ctx = span.spanContext();
    if (!isSpanContextValid(ctx)) return {};
    return {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
      trace_flags: ctx.traceFlags,
    };
  },
};

// '/' prefix-matches every route under the global prefix; '*' is invalid in Express 5
export const pinoModuleOptions: Params = {
  pinoHttp: pinoHttpOptions,
  forRoutes: ['/'],
};
