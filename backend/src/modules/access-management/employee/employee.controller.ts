// Employee Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    CreateEmployeePayloadSchema,
    SearchEmployeeQuerySchema,
    UpdateEmployeePayloadSchema,
} from './employee.validators';
import { StatusCodes } from 'http-status-codes';
import { EmployeeService } from './employee.service';
import { EmployeeMapper } from './employee.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Employee ID is required', null);
        }

        const employee = await EmployeeService.get(id, ctx, { populate: true });
        if (!employee) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Employee not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Employee fetched successfully',
            EmployeeMapper.toResponse(employee),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchEmployeeQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }
        const pagination = RequestHandler.getPagination(filters);

        const result = await EmployeeService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Employees fetched successfully',
            EmployeeMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateEmployeePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const employee = await EmployeeService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Employee created successfully',
            EmployeeMapper.toResponse(employee),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Employee ID is required', null);
        }

        const { data, success, error } = UpdateEmployeePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const employee = await EmployeeService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Employee updated successfully',
            EmployeeMapper.toResponse(employee),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const EmployeeController = {
    get,
    search,
    create,
    update,
};
