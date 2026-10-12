import express from 'express';
import { NotificationController } from './notification.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import { SearchNotificationQuerySchema, TestPublishNotificationPayloadSchema } from './notification.validators';
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

// TEMP (testing only) — publish an event to EventBridge to exercise the EventBridge→SQS→worker
// path from an HTTP call. Remove before production.
registry.registerPath({
    method: 'post',
    path: '/notifications/test-publish',
    tags: ['NOTIFICATION'],
    summary: 'TEMP: publish a test event to EventBridge (testing only)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: TestPublishNotificationPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Test event published to EventBridge' },
    },
});

// =======================================================================
// ======================= EXPORT NOTIFICATION ROUTES ====================
// =======================================================================
// Auth-only, no permission. The single endpoint returns the authenticated user's own
// notifications (recipient taken from ctx). Notifications are created internally via
// NotificationService.create by the events that trigger them.
NotificationRouter.get('/me', NotificationController.me);

// TEMP (testing only) — see swagger registration above. Remove before production.
NotificationRouter.post('/test-publish', NotificationController.testPublish);
