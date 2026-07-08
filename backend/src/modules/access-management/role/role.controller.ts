import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { CreateRolePayloadSchema, SearchRoleQuerySchema, UpdateRolePayloadSchema } from './role.validators';
import { StatusCodes } from 'http-status-codes';
import { RoleService } from './role.service';
import { RoleMapper } from './role.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Role ID is required', null);
        }

        const role = await RoleService.get(id, ctx);

        if (!role) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Role not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Role fetched successfully',
            RoleMapper.toResponse(role),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchRoleQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }
        const pagination = RequestHandler.getPagination(filters);

        const result = await RoleService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Roles fetched successfully',
            RoleMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateRolePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const role = await RoleService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Role created successfully',
            RoleMapper.toResponse(role),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Role ID is required', null);
        }

        const { data, success, error } = UpdateRolePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const role = await RoleService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Role updated successfully',
            RoleMapper.toResponse(role),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const RoleController = {
    get,
    search,
    create,
    update,
};
