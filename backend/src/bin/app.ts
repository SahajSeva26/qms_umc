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
import { buildContext } from '../shared/utils/contextBuilder';
import { runSeed } from '../shared/env';

// top level middleware
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: 'http://localhost:5173', // frontend URL
        credentials: true,
    }),
);
app.use('/api-docs', swaggerServe, swaggerSetup);

app.use(buildContext);
// application routes
app.use('/api/v1/auth', AuthRouter);
app.use('/api/v1/users', UserRouter);
app.use('/api/v1/tenants', TenantRouter);
app.use('/api/v1/permission-groups', PermissionGroupRouter);
app.use('/api/v1/role-types', RoleTypeRouter);

app.get('/health-check', (req, res) => {
    return ResponseHandler.appResponse(res, 200, true, 'Server is running', null);
});

// seed system user
runSeed();

export { app };
