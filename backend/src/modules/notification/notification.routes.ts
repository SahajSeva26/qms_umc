import express from 'express';
import { NotificationController } from './notification.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import { SearchNotificationQuerySchema } from './notification.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';

export const NotificationRouter = express.Router();

NotificationRouter.use(AuthMiddleware);

// get the caller's own notifications
registry.registerPath({
    method: 'get',
    path: '/notifications/me',
    tags: ['NOTIFICATION'],
    summary: "Get the caller's own notifications",
    request: {
        query: SearchNotificationQuerySchema,
    },
    responses: {
        200: { description: 'Notifications fetched successfully' },
    },
});

// =======================================================================
// ======================= EXPORT NOTIFICATION ROUTES ====================
// =======================================================================
// Auth-only, no permission. The single endpoint returns the authenticated user's own
// notifications (recipient taken from ctx). Notifications are created internally via
// NotificationService.create by the events that trigger them.
NotificationRouter.get('/me', NotificationController.me);
