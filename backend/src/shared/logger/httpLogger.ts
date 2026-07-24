import { pinoHttp } from 'pino-http';

import { logger } from './logger';
import { serializers } from './serializers';
import { generateUUID } from '../utils/strings';

// Automatic per-request HTTP logging (replaces the old manual res.on('finish')
// block in contextBuilder and the unused `morgan`). Attaches a request-scoped
// child logger at `req.log` (bound with the request id) and emits one completion
// line per request with method/url/status/duration.
export const httpLogger = pinoHttp({
    logger,
    serializers,

    // One id per request, shared with ctx.requestID (contextBuilder reads req.id).
    // Honour an inbound x-request-id (e.g. from a proxy) so traces stay stable.
    genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = (Array.isArray(existing) ? existing[0] : existing) || generateUUID();
        res.setHeader('x-request-id', id);
        return id;
    },

    // 5xx (or thrown errors) → error, 4xx → warn, everything else → info.
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },

    // originalUrl keeps the full path (Express rewrites req.url relative to the
    // router mount, which truncates nested routes). Data domains are separated by " | ".
    customSuccessMessage: (req: any, res) => `${req.method} ${req.originalUrl ?? req.url} | ${res.statusCode}`,
    customErrorMessage: (req: any, res) => `${req.method} ${req.originalUrl ?? req.url} | ${res.statusCode}`,
});
