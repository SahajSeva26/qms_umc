import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { CreatePermissionGroupPayloadSchema, UpdatePermissionGroupPayloadSchema } from './permissionGroup.validators';
import { StatusCodes } from 'http-status-codes';
import { PermissionGroupService } from './permissionGroup.service';
import { PermissionGroupMapper } from './permissionGroup.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Permission group ID is required', null);
        }

        const permissionGroup = await PermissionGroupService.get(id, ctx);
        if (!permissionGroup) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Permission group not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Permission group fetched successfully',
            PermissionGroupMapper.toResponse(permissionGroup),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const query = RequestHandler.parseQuery(req);
        const pagination = RequestHandler.getPagination(req);

        const result = await PermissionGroupService.search(query, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Permission groups fetched successfully',
            PermissionGroupMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreatePermissionGroupPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const permissionGroup = await PermissionGroupService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Permission group created successfully',
            PermissionGroupMapper.toResponse(permissionGroup),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Permission group ID is required', null);
        }

        const { data, success, error } = UpdatePermissionGroupPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const permissionGroup = await PermissionGroupService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Permission group updated successfully',
            PermissionGroupMapper.toResponse(permissionGroup),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const PermissionGroupController = {
    get,
    search,
    create,
    update,
};
