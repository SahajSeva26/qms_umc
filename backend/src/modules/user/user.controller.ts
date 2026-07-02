import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';
import { UpdateUserPayloadSchema } from './user.validators';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import { UserMapper } from './user.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';

const get = async (req: any, res: any) => {
    try {
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'User ID is required', null);
        }

        const user = await UserService.get(id);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'User fetched successfully',
            UserMapper.toResponse(user),
        );
    } catch (error) {
        return ResponseHandler.appResponse(
            res,
            StatusCodes.INTERNAL_SERVER_ERROR,
            false,
            'Internal server error',
            null,
        );
    }
};

const search = async (req: any, res: any) => {
    try {
        const query = RequestHandler.parseQuery(req);
        const pagination = RequestHandler.getPagination(req);

        const result = await UserService.search(query, pagination);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Users fetched successfully',
            UserMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'User ID is required', null);
        }

        const { data, success, error } = UpdateUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const user = await UserService.update(id, data);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'User updated successfully',
            UserMapper.toResponse(user),
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
