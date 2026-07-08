import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError, throwAppError } from '../../shared/utils/error';
import { UpdateUserPayloadSchema } from './user.validators';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import { UserMapper } from './user.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'User ID is required', null);
        }

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
        const query = RequestHandler.parseQuery(req);
        const pagination = RequestHandler.getPagination(req);

        const result = await UserService.search(query, ctx, { pagination });

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
        const { id } = req?.params;
        if (!id) {
            return throwAppError('User ID is required', StatusCodes.BAD_REQUEST);
        }

        const { data, success, error } = UpdateUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return throwAppError('Validation Error', StatusCodes.BAD_REQUEST, { fields: validationErrors });
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
