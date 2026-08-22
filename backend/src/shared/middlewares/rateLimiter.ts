import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { ResponseHandler } from '../utils/responseHandler';
import ENV from '../config/app.config';

// Shared 429 responder so rate-limit rejections match the app's single response shape.
const tooManyRequests = (message: string) => (req: any, res: any) =>
    ResponseHandler.appResponse(res, StatusCodes.TOO_MANY_REQUESTS, false, message, null);

// Global limiter — blanket abuse protection across the whole API.
export const globalRateLimiter = rateLimit({
    windowMs: ENV.RateLimit.WindowMs,
    limit: ENV.RateLimit.Max,
    standardHeaders: 'draft-7', // expose RateLimit-* headers
    legacyHeaders: false, // drop the deprecated X-RateLimit-* headers
    handler: tooManyRequests('Too many requests, please try again later'),
});

// Strict limiter — for auth endpoints (login/register), the brute-force targets.
// Complements the account-lockout logic in the auth service.
export const authRateLimiter = rateLimit({
    windowMs: ENV.RateLimit.AuthWindowMs,
    limit: ENV.RateLimit.AuthMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests('Too many authentication attempts, please try again later'),
});
