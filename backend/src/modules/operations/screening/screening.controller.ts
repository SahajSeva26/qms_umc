// Screening Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    CreateScreeningPayloadSchema,
    MoveStagePayloadSchema,
    SearchScreeningQuerySchema,
    UpdateScreeningPayloadSchema,
    VerifyConsentPayloadSchema,
} from './screening.validators';
import { StatusCodes } from 'http-status-codes';
import { ScreeningService } from './screening.service';
import { ScreeningMapper } from './screening.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { ScreeningReportQuerySchema } from './screening.validators';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Screening ID is required', null);
        }

        const screening = await ScreeningService.get(id, ctx, { populate: true });
        if (!screening) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Screening not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Screening fetched successfully', ScreeningMapper.toResponse(screening, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchScreeningQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await ScreeningService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Screenings fetched successfully', ScreeningMapper.toSearchResponse(result, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateScreeningPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const screening = await ScreeningService.create(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'Screening created successfully', ScreeningMapper.toResponse(screening, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Screening ID is required', null);
        }

        const { data, success, error } = UpdateScreeningPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const screening = await ScreeningService.update(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Screening updated successfully', ScreeningMapper.toResponse(screening, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const moveStage = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Screening ID is required', null);
        }

        const { data, success, error } = MoveStagePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const screening = await ScreeningService.moveStage(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Screening stage updated successfully', ScreeningMapper.toResponse(screening, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const verifyConsent = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Screening ID is required', null);
        }

        const { data, success, error } = VerifyConsentPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const screening = await ScreeningService.verifyConsent(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Consent verified successfully', ScreeningMapper.toResponse(screening, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const report = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = ScreeningReportQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await ScreeningService.report(filters, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Screening report generated successfully',
            ScreeningMapper.toReportResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const ScreeningController = {
    get,
    search,
    create,
    update,
    moveStage,
    verifyConsent,
    report,
};
