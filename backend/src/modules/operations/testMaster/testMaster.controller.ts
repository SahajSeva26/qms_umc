// TestMaster Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { CreateTestMasterPayloadSchema, SearchTestMasterQuerySchema, UpdateTestMasterPayloadSchema } from './testMaster.validators';
import { StatusCodes } from 'http-status-codes';
import { TestMasterService } from './testMaster.service';
import { TestMasterMapper } from './testMaster.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Test master ID is required', null);
        }

        const test = await TestMasterService.get(id, ctx, { populate: true });

        if (!test) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Test master not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test master fetched successfully', TestMasterMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchTestMasterQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await TestMasterService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test masters fetched successfully', TestMasterMapper.toSearchResponse(result, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateTestMasterPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const test = await TestMasterService.create(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'Test master created successfully', TestMasterMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Test master ID is required', null);
        }

        const { data, success, error } = UpdateTestMasterPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const test = await TestMasterService.update(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test master updated successfully', TestMasterMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const TestMasterController = {
    get,
    search,
    create,
    update,
};
