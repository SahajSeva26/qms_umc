// Notification Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';

export const NotificationMapper = {
    // personal-inbox shape (/me): recipient/tenant are the caller's own and attempts/error are
    // sending-worker internals — all omitted here.
    toResponse: (notification: any, ctx: RequestContext) => {
        const result: any = {
            id: notification._id?.toString(),
            entity: notification.entity || null,
            type: notification.type,
            channel: notification.channel,
            subject: notification.subject,
            body: notification.body,
            status: notification.status,
            sentAt: notification.sentAt || null,
            read: notification.read,
            readAt: notification.readAt || null,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const notification of data?.items || []) {
            result.items.push(NotificationMapper.toResponse(notification, ctx));
        }
        return result;
    },
};
