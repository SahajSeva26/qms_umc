// Notification Controller
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';
import { SearchNotificationQuerySchema, TestPublishNotificationPayloadSchema } from './notification.validators';
import { StatusCodes } from 'http-status-codes';
import { NotificationService } from './notification.service';
import { NotificationMapper } from './notification.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { eventProcessor } from '../../shared/helpers/eventProcessor';
import { NOTIFICATION_CHANNELS } from './notification.constants';

// GET /notifications/me — the caller's own notifications. The recipient is taken from ctx
// (the authenticated user); search() pins the query to it, so no user id is ever accepted.
const me = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchNotificationQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        // pin the search to the caller's own notifications, and to the in-app inbox channel only
        // (email/sms/whatsapp rows are delivery records, not inbox items)
        filters.recipient = ctx.user?._id;
        filters.channel = NOTIFICATION_CHANNELS.IN_APP;

        const pagination = RequestHandler.getPagination(filters);

        const result = await NotificationService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Notifications fetched successfully',
            NotificationMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// PATCH /notifications/me/read — mark ALL the caller's in-app notifications as read.
// No id/user in the request — the recipient is taken from ctx.
const markAllRead = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const result = await NotificationService.markAllRead(ctx);
        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Notifications marked as read', result);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// TEMP (testing only) — POST /notifications/test-publish
// Publishes an event to EventBridge so it routes to SQS and is picked up by the notification
// worker. Lets us exercise the publish→consume path from an HTTP call. Remove before production.
const testPublish = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: payload, success, error } = TestPublishNotificationPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const [entity = 'camp', event = 'create'] = (payload.type ?? 'camp.create').split('.');
        await eventProcessor.process(entity, event, payload.data ?? {}, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test event published to EventBridge', {
            type: payload.type,
            data: payload.data ?? {},
        });
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const NotificationController = {
    me,
    markAllRead,
    testPublish,
};
