import mongoose, { HydratedDocument } from 'mongoose';
import { IQaFeedback, QaFeedbackModel } from './qaFeedback.model';
import { ICreateQaFeedbackPayload, ISearchQaFeedbackQuery, IUpdateQaFeedbackPayload } from './qaFeedback.validators';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';
import { JiraProvider } from '../../shared/providers/jira/jira.provider';

type QaFeedbackDocument = HydratedDocument<IQaFeedback> | null;

// No ctx.where() tenant-scoping here, unlike every other module in this app
// — a QA report is about a SCREEN in the application, not about tenant-owned
// business data, so it's deliberately visible to any qa-feedback:manage
// holder regardless of which tenant the reporting user's Role belongs to.
const populate: any[] = [{ path: 'reportedBy', select: 'firstName lastName email' }];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const get = async (id: string, options?: IServiceOptions): Promise<QaFeedbackDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    let query = QaFeedbackModel.findById(id);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchQaFeedbackQuery, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IQaFeedback> = {};
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.issueKey) {
        where.issueKey = filters.issueKey;
    }
    if (filters.pageRoute) {
        where.pageRoute = { $regex: filters.pageRoute, $options: 'i' };
    }
    if (filters.reportedBy) {
        where.reportedBy = filters.reportedBy;
    }

    const countPromise = QaFeedbackModel.countDocuments(where);
    const dataPromise = QaFeedbackModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateQaFeedbackPayload, ctx: RequestContext): Promise<HydratedDocument<IQaFeedback>> => {
    let entity = new QaFeedbackModel({
        pageRoute: model.pageRoute,
        pageTitle: model.pageTitle ?? '',
        pinXPercent: model.pinXPercent,
        pinYPercent: model.pinYPercent,
        comment: model.comment,
        reportedBy: ctx.user?._id,
    });

    // A feedback row REQUIRES its Jira ticket (issueKey is required + unique — the key a
    // webhook later uses to find this row). So create the ticket FIRST; if Jira is
    // unreachable or returns no key, fail the request rather than persist a ticketless row.
    let result: any;
    try {
        result = await JiraProvider.createTicket({
            summary: `${model.pageTitle}-(${model.pageRoute})`,
            description: model.comment,
        });
    } catch (err) {
        ctx.logger.error({ err }, 'Jira ticket creation failed');
        return throwAppError('Failed to create the Jira ticket for this feedback', StatusCodes.BAD_GATEWAY);
    }
    if (!result?.key) {
        return throwAppError('Jira did not return an issue key', StatusCodes.BAD_GATEWAY);
    }
    entity.issueKey = result.key;
    ctx.logger.info({ issueKey: result.key }, 'Jira ticket created');

    // persist only after the ticket exists — issueKey is now populated for the required+unique field
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateQaFeedbackPayload): Promise<HydratedDocument<IQaFeedback>> => {
    const feedback = await QaFeedbackService.get(id);
    if (!feedback) {
        return throwAppError('QA feedback not found', StatusCodes.NOT_FOUND);
    }

    if (model.status) feedback.status = model.status;
    if (model.resolutionNote !== undefined) feedback.resolutionNote = model.resolutionNote;

    return await feedback.save();
};

// Jira webhook sync — looks up the feedback row by its Jira issue key (`id`, the stable
// identifier Jira sends on an issue change) and updates its status to mirror Jira. Unlike
// update(), the lookup is by issueKey, not _id.
const jiraWebhook = async (id: string, status: string): Promise<HydratedDocument<IQaFeedback>> => {
    const feedback = await QaFeedbackModel.findOne({ issueKey: id });
    if (!feedback) {
        return throwAppError('QA feedback not found', StatusCodes.NOT_FOUND);
    }

    feedback.status = status;

    return await feedback.save();
};

export const QaFeedbackService = {
    get,
    search,
    create,
    update,
    jiraWebhook,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
