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

// mark ALL the caller's in-app notifications as read (recipient from ctx, no id)
registry.registerPath({
    method: 'patch',
    path: '/notifications/me/read',
    tags: ['NOTIFICATION'],
    summary: "Mark all the caller's in-app notifications as read",
    responses: {
        200: { description: 'Notifications marked as read' },
    },
});

// =======================================================================
// ======================= EXPORT NOTIFICATION ROUTES ====================
// =======================================================================
// Auth-only, no permission. Notifications are created internally by the domain events that
// trigger them (camp/lead/project create+update); the client only reads + marks read.
NotificationRouter.get('/me', NotificationController.me);
NotificationRouter.patch('/me/read', NotificationController.markAllRead);
