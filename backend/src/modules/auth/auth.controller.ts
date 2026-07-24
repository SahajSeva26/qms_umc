import { StatusCodes } from 'http-status-codes';
import { formatZodError } from '../../shared/utils/error';
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { AuthService } from './auth.service';
import { AuthMapper } from './auth.mapper';
import {
    ForgotPasswordPayloadSchema,
    LoginUserPayloadSchema,
    RegisterUserPayloadSchema,
    ResetPasswordPayloadSchema,
} from './auth.validators';
import { CookieHandler } from '../../shared/utils/cookies';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { AUTH_TOKENS } from './auth.constants';
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
        CookieHandler.setAccessToken(res, accessToken);
        CookieHandler.setRefreshToken(res, refreshToken);
        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'User logged in successfully',
            AuthMapper.toResponse(user),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const logout = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        // 1: clear backend session
        const userId = ctx.user?._id;
        if (userId) {
            await AuthService.logout(userId, ctx);
        }
        // 2: clear browser  coookies second
        CookieHandler.clear(res, AUTH_TOKENS.ACCESS_TOKEN);
        CookieHandler.clear(res, AUTH_TOKENS.REFRESH_TOKEN);
        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'User logged out successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const refreshToken = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        // 1: get refresh token from cookies
        const refreshToken = CookieHandler.get(req, AUTH_TOKENS.REFRESH_TOKEN);

        // 2: presence check (signature + DB match are verified in the service)
        if (!refreshToken) {
            return ResponseHandler.appResponse(res, StatusCodes.UNAUTHORIZED, false, 'Refresh token not found', null);
        }

        const { newAccessToken, newRefreshToken } = await AuthService.refreshToken(refreshToken, ctx);

        // 3: set cookies
        CookieHandler.setAccessToken(res, newAccessToken);
        CookieHandler.setRefreshToken(res, newRefreshToken);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Token refreshed successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const me = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const data = await AuthService.session(ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Current session fetched successfully',
            AuthMapper.toSession(data),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// self-service: logged-in user changes their own password
const resetPassword = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { data, success, error } = ResetPasswordPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        await AuthService.resetPassword(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Password reset successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// admin-initiated: tenant:admin resets another user's password
const forgotPassword = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { data, success, error } = ForgotPasswordPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        await AuthService.forgotPassword(data, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Password reset successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const AuthController = {
    register,
    login,
    logout,
    refreshToken,
    me,
    resetPassword,
    forgotPassword,
};
