import { StatusCodes } from 'http-status-codes';
import { formatZodError } from '../../shared/utils/error';
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { AuthService } from './auth.service';
import { AuthMapper } from './auth.mapper';
import { RegisterUserPayloadSchema } from './auth.validators';

const register = async (req: any, res: any) => {
    try {
        const { data, success, error } = RegisterUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const user = await AuthService.register(data);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'User registered successfully',
            AuthMapper.toResponse(user),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const AuthController = {
    register,
};
