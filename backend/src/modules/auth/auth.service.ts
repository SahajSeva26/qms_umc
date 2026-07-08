import { HydratedDocument } from 'mongoose';
import { UserService } from '../user/user.service';
import { ILoginUserPayload, IRegisterUserPayload } from './auth.validators';
import { IUser } from '../user/user.model';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { TokenHandler } from '../../shared/helpers/tokenHelper';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { RoleService } from '../access-management/role/role.service';
import { ITokenPayload } from '../../shared/helpers/tokenHelper';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const register = async (data: IRegisterUserPayload, ctx: RequestContext): Promise<HydratedDocument<IUser>> => {
    const user = await UserService.create(data, ctx);
    return user;
};
const login = async (data: ILoginUserPayload, ctx: RequestContext) => {
    // 1: get user
    const user = await UserService.getUserWithPassword(data.email);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //2: check account locked
    if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingTime = user.lockUntil.getTime() - Date.now();
        return throwAppError(
            `Account is locked,try again in ${Math.ceil(remainingTime / 60000)} minutes.`,
            StatusCodes.FORBIDDEN,
        );
    }

    //3: validate password
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
        user.loginAttempts += 1;

        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            //lock account if failed 5 times
            user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            user.loginAttempts = 0;
            await user.save();
            return throwAppError('Account locked, try after few minutes', StatusCodes.FORBIDDEN);
        }

        await user.save();
        return throwAppError(
            `Invalid credentials, attempt remaining: ${MAX_LOGIN_ATTEMPTS - user.loginAttempts}`,
            StatusCodes.UNAUTHORIZED,
        );
    }

    // 4: reset if everything is right
    user.loginAttempts = 0;
    user.lockUntil = null;

    // 5: find user role
    let userRole: any = await RoleService.search({ user: user.id }, ctx);
    if (userRole.items.length == 0) {
        return throwAppError(
            'No role assigned to this account. Please contact your administrator.',
            StatusCodes.FORBIDDEN,
        );
    }
    userRole = userRole.items[0];

    const payload: ITokenPayload = {
        _id: user.id.toString(),
        email: user.email,
        role: userRole.id.toString(),
        tenant: userRole.tenant.id.toString(),
    };

    // 5: generate tokens
    const accessToken = TokenHandler.generateAccessToken(payload);
    const refreshToken = TokenHandler.generateRefreshToken(payload);

    // 6: save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    return {
        user,
        accessToken,
        refreshToken,
    };
};

const logout = async (userId: string, ctx: RequestContext) => {
    //1: get user
    const user = await UserService.get(userId, ctx);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //2: clear refresh token
    user.refreshToken = null;
    await user.save();
    return true;
};
const refreshToken = async (refreshToken: string, ctx: RequestContext) => {
    //1: verify token (throws AppError 401 on invalid/expired)
    const decoded: any = TokenHandler.verifyRefreshToken(refreshToken);

    //2: get user from user service
    const userId: string = decoded._id.toString();
    const user = await UserService.get(userId, ctx);
    if (!user) {
        return throwAppError('User not found, login again', StatusCodes.NOT_FOUND);
    }

    // 3: check if refresh token matches the one on record (before any further DB work)
    if (user.refreshToken?.toString() !== refreshToken.toString()) {
        return throwAppError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    // 4: get user role
    let userRole: any = await RoleService.search({ user: user.id }, ctx);
    if (userRole.items.length == 0) {
        return throwAppError(
            'No role assigned to this account. Please contact your administrator.',
            StatusCodes.FORBIDDEN,
        );
    }
    userRole = userRole.items[0];

    //5: generate tokens with new payload
    const freshPayload: ITokenPayload = {
        _id: user.id.toString(),
        email: user.email,
        role: userRole.id.toString(),
        tenant: userRole.tenant.id.toString(),
    };
    const newAccessToken = TokenHandler.generateAccessToken(freshPayload);
    const newRefreshToken = TokenHandler.generateRefreshToken(freshPayload);

    // 6: save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return {
        newAccessToken,
        newRefreshToken,
    };
};

export const AuthService = {
    register,
    login,
    logout,
    refreshToken,
};
