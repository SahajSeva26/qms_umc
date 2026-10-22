// Notification Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';

export const NotificationMapper = {
    // personal-inbox shape (/me): recipient/tenant are the caller's own and attempts/error are
    // sending-worker internals — all omitted here.
    toResponse: (notification: any, ctx: RequestContext) => ({
        id: notification._id?.toString(),
        entity: notification.entity || null,
        event: notification.event,
        channel: notification.channel,
        subject: notification.subject,
        body: notification.body,
        status: notification.status,
        sentAt: notification.sentAt || null,
        read: notification.read,
        readAt: notification.readAt || null,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
    }),
    // decoupled from toResponse — fields are inlined independently so the search-row shape
    // can be trimmed later without touching GET /:id (matches the app-wide mapper convention).
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => ({
        count: data?.count || 0,
        items: (data?.items || []).map((notification: any) => ({
            id: notification._id?.toString(),
            entity: notification.entity || null,
            event: notification.event,
            channel: notification.channel,
            subject: notification.subject,
            body: notification.body,
            status: notification.status,
            sentAt: notification.sentAt || null,
            read: notification.read,
            readAt: notification.readAt || null,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
        })),
    }),
};
