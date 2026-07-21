import mongoose, { HydratedDocument } from 'mongoose';
import { IQaFeedback, QaFeedbackModel } from './qaFeedback.model';
import { ICreateQaFeedbackPayload, ISearchQaFeedbackQuery, IUpdateQaFeedbackPayload } from './qaFeedback.validators';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID, escapeRegex } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';

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
    if (filters.pageRoute) {
        where.pageRoute = { $regex: escapeRegex(filters.pageRoute), $options: 'i' };
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
    const entity = new QaFeedbackModel({
        pageRoute: model.pageRoute,
        pageTitle: model.pageTitle ?? '',
        pinXPercent: model.pinXPercent,
        pinYPercent: model.pinYPercent,
        comment: model.comment,
        reportedBy: ctx.user?._id,
    });

    return await entity.save();
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

export const QaFeedbackService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
