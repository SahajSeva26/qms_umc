// Inventory-request Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    CreateInventoryRequestPayloadSchema,
    MoveStagePayloadSchema,
    SearchInventoryRequestQuerySchema,
    UpdateInventoryRequestPayloadSchema,
} from './inventory-request.validators';
import { StatusCodes } from 'http-status-codes';
import { InventoryRequestService } from './inventory-request.service';
import { InventoryRequestMapper } from './inventory-request.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Request ID is required', null);
        }

        const request = await InventoryRequestService.get(id, ctx, { populate: true });

        if (!request) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Request not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Request fetched successfully',
            InventoryRequestMapper.toResponse(request),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchInventoryRequestQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await InventoryRequestService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Requests fetched successfully',
            InventoryRequestMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateInventoryRequestPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const request = await InventoryRequestService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Request created successfully',
            InventoryRequestMapper.toResponse(request),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Request ID is required', null);
        }

        const { data, success, error } = UpdateInventoryRequestPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const request = await InventoryRequestService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Request updated successfully',
            InventoryRequestMapper.toResponse(request),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const moveStage = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Request ID is required', null);
        }

        const { data, success, error } = MoveStagePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const request = await InventoryRequestService.moveStage(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Request stage updated successfully',
            InventoryRequestMapper.toResponse(request),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InventoryRequestController = {
    get,
    search,
    create,
    update,
    moveStage,
};
