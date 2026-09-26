// Notification Validators
import { z } from 'zod';
import { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } from './notification.constants';
import { isValidObjectID } from '../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// query params arrive as strings — accept only 'true'/'false' and coerce to a real boolean
const booleanish = z.enum(['true', 'false']).transform((val) => val === 'true');

// the source entity a notification is about (e.g. the camp that was created)
const entitySchema = z.object({
    id: objectId('Entity').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    type: z.string().min(1).openapi({ example: 'camp' }),
    event: z.string().min(1).openapi({ example: 'camp.create' }),
});

//1: create ====================================>
export const CreateNotificationPayloadSchema = z.object({
    recipient: objectId('Recipient').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // optional — pass it when the caller already has the tenant in hand
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    entity: entitySchema.optional(),
    type: z.enum(Object.values(NOTIFICATION_TYPES)).openapi({ example: 'camp.create' }),
    channel: z.enum(Object.values(NOTIFICATION_CHANNELS)).openapi({ example: 'in-app' }),
    subject: z.string().optional().openapi({ example: 'New camp created' }),
    body: z.string().optional().openapi({ example: 'A new camp has been created for your division.' }),
});
export type ICreateNotificationPayload = z.infer<typeof CreateNotificationPayloadSchema>;

//2: update ====================================>
// only the recipient's read state is editable — everything else is fixed at creation.
export const UpdateNotificationPayloadSchema = z.object({
    read: z.boolean().optional().openapi({ example: true }),
});
export type IUpdateNotificationPayload = z.infer<typeof UpdateNotificationPayloadSchema>;

//3: search ====================================>
export const SearchNotificationQuerySchema = z.object({
    type: z.enum(Object.values(NOTIFICATION_TYPES)).optional().openapi({ example: 'camp.create' }),
    channel: z.enum(Object.values(NOTIFICATION_CHANNELS)).optional().openapi({ example: 'in-app' }),
    status: z.enum(Object.values(NOTIFICATION_STATUS)).optional().openapi({ example: 'pending' }),
    read: booleanish.optional().openapi({ example: 'false' }),
    // set by the controller from ctx (the authenticated user) — never taken from the client
    recipient: objectId('Recipient').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchNotificationQuery = z.infer<typeof SearchNotificationQuerySchema>;
