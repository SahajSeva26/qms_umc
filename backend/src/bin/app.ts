import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ResponseHandler } from '../shared/utils/responseHandler';
import { swaggerServe, swaggerSetup } from '../shared/config/swagger/swagger';
import { AuthRouter } from '../modules/auth/auth.routes';
import { UserRouter } from '../modules/user/user.routes';
import { TenantRouter } from '../modules/access-management/tenant/tenant.routes';
import { PermissionGroupRouter } from '../modules/access-management/permission-group/permissionGroup.routes';
import { RoleTypeRouter } from '../modules/access-management/role-type/roleType.routes';
import { RoleRouter } from '../modules/access-management/role/role.routes';
import { DivisionRouter } from '../modules/division/division.routes';
import { LeadRouter } from '../modules/crm/lead/lead.routes';
import { ProjectRouter } from '../modules/crm/project/project.routes';
import { QaFeedbackRouter } from '../modules/qa-feedback/qaFeedback.routes';
import { DoctorRouter } from '../modules/doctor/doctor.routes';
import { GeoProfileRouter } from '../modules/operations/geoProfile/geoProfile.routes';
import { CampRouter } from '../modules/operations/camp/camp.routes';
import { buildContext } from '../shared/utils/contextBuilder';
import ENV from '../shared/config/app.config';
import logger from '../shared/utils/logger';
import { globalRateLimiter, authRateLimiter } from '../shared/middlewares/rateLimiter';

// top level middleware
const app = express();

// Behind Railway's proxy — trust the first hop so req.ip is the real client IP
// (rate limiting keys on IP; without this every request looks like the proxy's IP).
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

// CORS — only origins in ENV.App.CorsOrigins (APP_CORS_ORIGINS) may call the API.
// Requests with no Origin header (curl, server-to-server, health checks) are allowed.
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || ENV.App.CorsOrigins.includes(origin)) {
                return callback(null, true);
            }

            logger.error(`Blocked by CORS: ${origin}`);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    }),
);
app.use('/api-docs', swaggerServe, swaggerSetup);

// Global rate limit — covers the whole API (health-check + swagger sit outside /api/v1)
app.use('/api/v1', globalRateLimiter);

app.use(buildContext);
// application routes — auth gets the stricter limiter on top of the global one
app.use('/api/v1/auth', authRateLimiter, AuthRouter);
app.use('/api/v1/users', UserRouter);
app.use('/api/v1/tenants', TenantRouter);
app.use('/api/v1/permission-groups', PermissionGroupRouter);
app.use('/api/v1/role-types', RoleTypeRouter);
app.use('/api/v1/roles', RoleRouter);
app.use('/api/v1/divisions', DivisionRouter);
app.use('/api/v1/leads', LeadRouter);
app.use('/api/v1/projects', ProjectRouter);
app.use('/api/v1/qa-feedback', QaFeedbackRouter);
app.use('/api/v1/doctors', DoctorRouter);
app.use('/api/v1/geo-profiles', GeoProfileRouter);
app.use('/api/v1/camps', CampRouter);

// Captured once at boot — lets /health-check report how long the current deploy has been up.
const startedAt = new Date().toISOString();

app.get('/health-check', (req, res) => {
    return ResponseHandler.appResponse(res, 200, true, 'Server is running', {
        environment: ENV.App.Environment,
        version: ENV.Deployment.Version,
        commit: ENV.Deployment.Commit,
        commitMessage: ENV.Deployment.CommitMessage,
        branch: ENV.Deployment.Branch,
        startedAt,
        uptimeSec: Math.floor(process.uptime()),
    });
});

export { app };
