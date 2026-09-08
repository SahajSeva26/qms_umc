// File Controller
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';
import {
    ChangeFileStatusPayloadSchema,
    CreateFilePayloadSchema,
    SearchFileQuerySchema,
    UpdateFilePayloadSchema,
} from './file.validators';
import { StatusCodes } from 'http-status-codes';
import { FileService } from './file.service';
import { FileMapper } from './file.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'File ID is required', null);
        }

        const file = await FileService.get(id, ctx, { populate: true });

        if (!file) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'File not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'File fetched successfully', FileMapper.toResponse(file));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchFileQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await FileService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Files fetched successfully', FileMapper.toSearchResponse(result));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateFilePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const file = await FileService.create(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'File created successfully', FileMapper.toResponse(file));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'File ID is required', null);
        }

        const { data, success, error } = UpdateFilePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const file = await FileService.update(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'File updated successfully', FileMapper.toResponse(file));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const changeStatus = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'File ID is required', null);
        }

        const { data, success, error } = ChangeFileStatusPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const file = await FileService.changeStatus(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'File status updated successfully', FileMapper.toResponse(file));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const FileController = {
    get,
    search,
    create,
    update,
    changeStatus,
};
