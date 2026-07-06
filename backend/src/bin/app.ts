import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ResponseHandler } from '../shared/utils/responseHandler';
import { swaggerServe, swaggerSetup } from '../shared/config/swagger/swagger';
import { AuthRouter } from '../modules/auth/auth.routes';
import { UserRouter } from '../modules/user/user.routes';
import { buildContext } from '../shared/utils/contextBuilder';

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

app.get('/health-check', (req, res) => {
    return ResponseHandler.appResponse(res, 200, true, 'Server is running', null);
});

export { app };
