import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { ResponseHandler } from '../utils/responseHandler';
import ENV from '../config/app.config';

// Rate limiting is only enforced in production. Everywhere else (development/test) the limiters
// are a pass-through so local runs, e2e tests, and QA scripts aren't throttled. Call sites stay
// unchanged — each export is valid Express middleware either way.
const isProduction = ENV.App.Environment === 'production';

// No-op middleware used outside production — just hands off to the next handler.
const passthrough = (req: any, res: any, next: any) => next();

// Shared 429 responder so rate-limit rejections match the app's single response shape.
const tooManyRequests = (message: string) => (req: any, res: any) =>
    ResponseHandler.appResponse(res, StatusCodes.TOO_MANY_REQUESTS, false, message, null);

// Global limiter — blanket abuse protection across the whole API.
export const globalRateLimiter = isProduction
    ? rateLimit({
          windowMs: ENV.RateLimit.WindowMs,
          limit: ENV.RateLimit.Max,
          standardHeaders: 'draft-7', // expose RateLimit-* headers
          legacyHeaders: false, // drop the deprecated X-RateLimit-* headers
          handler: tooManyRequests('Too many requests, please try again later'),
      })
    : passthrough;

// Strict limiter — for auth endpoints (login/register), the brute-force targets.
// Complements the account-lockout logic in the auth service.
export const authRateLimiter = isProduction
    ? rateLimit({
          windowMs: ENV.RateLimit.AuthWindowMs,
          limit: ENV.RateLimit.AuthMax,
          standardHeaders: 'draft-7',
          legacyHeaders: false,
          handler: tooManyRequests('Too many authentication attempts, please try again later'),
      })
    : passthrough;

// Report limiter — for report/aggregation endpoints, which tend to be heavier queries
// than typical CRUD routes and are worth throttling separately from the global limit.
export const reportRateLimiter = isProduction
    ? rateLimit({
          windowMs: ENV.RateLimit.ReportWindowMs,
          limit: ENV.RateLimit.ReportMax,
          standardHeaders: 'draft-7',
          legacyHeaders: false,
          handler: tooManyRequests('Too many report requests, please try again later'),
      })
    : passthrough;
