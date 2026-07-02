import { StatusCodes } from 'http-status-codes';
import { formatZodError } from '../../shared/utils/error';
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { AuthService } from './auth.service';
import { AuthMapper } from './auth.mapper';
import { LoginUserPayloadSchema, RegisterUserPayloadSchema } from './auth.validators';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from '../../shared/utils/cookies';
import { RequestContext } from '../../shared/utils/contextBuilder';

const register = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { data, success, error } = RegisterUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const user = await AuthService.register(data, ctx);

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

const login = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { data, success, error } = LoginUserPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const { user, accessToken, refreshToken } = await AuthService.login(data, ctx);

        //set cookies
        setAccessCookie(res, accessToken);
        setRefreshCookie(res, refreshToken);
        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'User logged in successfully', {
            data: AuthMapper.toResponse(user),
            // accessToken,
            // refreshToken,
        });
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const logout = async (req: any, res: any) => {
    try {
        clearAuthCookies(res);
        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'User logged out successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const AuthController = {
    register,
    login,
    logout,
};
