// Notification Service
import mongoose, { HydratedDocument } from 'mongoose';
import { INotification, NotificationModel } from './notification.model';
import {
    ICreateNotificationPayload,
    ISearchNotificationQuery,
    IUpdateNotificationPayload,
} from './notification.validators';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';

type NotificationDocument = HydratedDocument<INotification> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'recipient', select: 'firstName lastName email' },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = (model: any, entity: HydratedDocument<INotification>) => {
    if (model.recipient) {
        entity.recipient = model.recipient;
    }
    if (model.tenant !== undefined) {
        entity.tenant = model.tenant;
    }
    if (model.entity !== undefined) {
        entity.entity = model.entity;
    }
    if (model.type) {
        entity.type = model.type;
    }
    if (model.channel) {
        entity.channel = model.channel;
    }
    if (model.subject !== undefined) {
        entity.subject = model.subject;
    }
    if (model.body !== undefined) {
        entity.body = model.body;
    }
    if (model.read !== undefined) {
        entity.read = model.read;
        entity.readAt = model.read ? new Date() : null;
    }
    return entity;
};

// internal-only fetch by id — no scope filter (callers are trusted services)
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<NotificationDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<INotification> = { _id: id };

    let query = NotificationModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchNotificationQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<INotification> = {};

    //1: recipient filter — the controller pins this to the caller's id (from ctx)
    if (filters.recipient) {
        where.recipient = filters.recipient;
    }

    //2: plain filters
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.channel) {
        where.channel = filters.channel;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.read !== undefined) {
        where.read = filters.read;
    }

    //3: execute
    const countPromise = NotificationModel.countDocuments(where);
    const dataPromise = NotificationModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

// System-created: an internal event (camp.create, camp.approved, ...) raises a notification for
// a recipient on a channel. Tenant is optional — pass it when the caller already has it in hand.
const create = async (model: ICreateNotificationPayload, ctx: RequestContext): Promise<HydratedDocument<INotification>> => {
    const entity = new NotificationModel({});
    let notification = set(model, entity);
    notification = await notification.save();

    return notification;
};

const update = async (id: string, model: IUpdateNotificationPayload, ctx: RequestContext) => {
    //1: get notification first (own-scoped)
    let notification = await NotificationService.get(id, ctx);
    if (!notification) {
        return throwAppError('Notification not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields
    notification = set(model, notification);
    notification = await notification.save();

    return notification;
};

export const NotificationService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
