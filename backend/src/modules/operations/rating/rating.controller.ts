// Rating Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { CreateRatingPayloadSchema, SearchRatingQuerySchema, UpdateRatingPayloadSchema } from './rating.validators';
import { StatusCodes } from 'http-status-codes';
import { RatingService } from './rating.service';
import { RatingMapper } from './rating.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Rating ID is required', null);
        }

        const rating = await RatingService.get(id, ctx, { populate: true });
        if (!rating) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Rating not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Rating fetched successfully', RatingMapper.toResponse(rating, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchRatingQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await RatingService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Ratings fetched successfully', RatingMapper.toSearchResponse(result, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateRatingPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const rating = await RatingService.create(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'Rating created successfully', RatingMapper.toResponse(rating, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Rating ID is required', null);
        }

        const { data, success, error } = UpdateRatingPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const rating = await RatingService.update(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Rating updated successfully', RatingMapper.toResponse(rating, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const RatingController = {
    get,
    search,
    create,
    update,
};
