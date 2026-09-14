import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';
import {
    CreateQaFeedbackPayloadSchema,
    UpdateQaFeedbackPayloadSchema,
    SearchQaFeedbackQuerySchema,
} from './qaFeedback.validators';
import { StatusCodes } from 'http-status-codes';
import { QaFeedbackService } from './qaFeedback.service';
import { QaFeedbackMapper } from './qaFeedback.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'QA feedback ID is required', null);
        }

        const feedback = await QaFeedbackService.get(id, { populate: true });

        if (!feedback) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'QA feedback not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'QA feedback fetched successfully',
            QaFeedbackMapper.toResponse(feedback, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchQaFeedbackQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await QaFeedbackService.search(filters, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'QA feedback fetched successfully',
            QaFeedbackMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateQaFeedbackPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const feedback = await QaFeedbackService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'QA feedback submitted successfully',
            QaFeedbackMapper.toResponse(feedback, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'QA feedback ID is required', null);
        }

        const { data, success, error } = UpdateQaFeedbackPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const feedback = await QaFeedbackService.update(id, data);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'QA feedback updated successfully',
            QaFeedbackMapper.toResponse(feedback, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// Jira webhook receiver — Jira calls this when an issue changes, so we can sync the
// matching feedback (looked up by its unique issueKey) back to the row.
// TODO: verify the Jira webhook signature/secret, then update the feedback status by issueKey.
const jiraWebhook = async (req: any, res: any) => {
    try {
        const log = req.context.logger;


        const issue = req.body?.issue || {};

        const issueKey = issue?.key || '';
        const status = issue?.fields?.status?.name || '';


        if (!issueKey || !status) {
            return ResponseHandler.appResponse(
                res,
                StatusCodes.BAD_REQUEST,
                false,
                'Webhook payload missing issue key or status',
                null,
            );
        }

        await QaFeedbackService.jiraWebhook(issueKey, status);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Webhook received', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const QaFeedbackController = {
    get,
    search,
    create,
    update,
    jiraWebhook,
};
