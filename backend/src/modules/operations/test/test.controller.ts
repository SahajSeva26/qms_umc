// Test Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { CreateTestPayloadSchema, SearchTestQuerySchema, UpdateTestPayloadSchema } from './test.validators';
import { StatusCodes } from 'http-status-codes';
import { TestService } from './test.service';
import { TestMapper } from './test.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { TestReportQuerySchema } from './test.validators';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Test ID is required', null);
        }

        const test = await TestService.get(id, ctx, { populate: true });
        if (!test) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Test not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test fetched successfully', TestMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchTestQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await TestService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Tests fetched successfully', TestMapper.toSearchResponse(result, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateTestPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const test = await TestService.create(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'Test created successfully', TestMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Test ID is required', null);
        }

        const { data, success, error } = UpdateTestPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const test = await TestService.update(id, data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Test updated successfully', TestMapper.toResponse(test, ctx));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const report = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = TestReportQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await TestService.report(filters, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Test report generated successfully',
            TestMapper.toReportResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const TestController = {
    get,
    search,
    create,
    update,
    report,
};
