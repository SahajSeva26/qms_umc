import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError, throwAppError } from '../../shared/utils/error';
import { SearchUserQuerySchema, UpdateUserPayloadSchema } from './user.validators';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import { UserMapper } from './user.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        
        //1: get user id
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'User ID is required', null);
        }

        //2: get user
        const user = await UserService.get(id, ctx);
        if (!user) {
            return throwAppError('User not found', StatusCodes.NOT_FOUND);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'User fetched successfully',
            UserMapper.toResponse(user, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        //1: validate filters
        const { data: filters, success, error } = SearchUserQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        //2: get pagination
        const pagination = RequestHandler.getPagination(filters);

        //3: search users
        const result = await UserService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Users fetched successfully',
            UserMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        //1: get user id
        const { id } = req?.params;
        if (!id) {
            return throwAppError('User ID is required', StatusCodes.BAD_REQUEST);
        }

        //2: validate payload
        const { data, success, error } = UpdateUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const user = await UserService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'User updated successfully',
            UserMapper.toResponse(user, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};
export const UserController = {
    get,
    search,
    update,
};
