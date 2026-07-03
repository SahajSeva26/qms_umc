import { HydratedDocument } from 'mongoose';
import { UserService } from '../user/user.service';
import { ILoginUserPayload, IRegisterUserPayload } from './auth.validators';
import { IUser } from '../user/user.model';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { TokenHandler } from '../../shared/helpers/tokenHelper';
import { ContextUser, RequestContext } from '../../shared/utils/contextBuilder';
import { CookieHandler } from '../../shared/utils/cookies';

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
            `Invalid credentials, attempt remaining: ${5 - user.loginAttempts}`,
            StatusCodes.UNAUTHORIZED,
        );
    }

    // 4: reset if everything is right
    user.loginAttempts = 0;
    user.lockUntil = null;

    // 5: generate tokens
    const accessToken = TokenHandler.generateAccessToken(user);
    const refreshToken = TokenHandler.generateRefreshToken(user);

    // 6: save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    return {
        user,
        accessToken,
        refreshToken,
    };
};

const refreshToken = async (refreshToken: string, ctx: RequestContext) => {
    //1: generate new access token & refresh token
    const payload = TokenHandler.decodePayload(refreshToken);
    const newAccessToken = TokenHandler.generateAccessToken(payload);
    const newRefreshToken = TokenHandler.generateRefreshToken(payload);

    //2: save new refresh token in database
    const userId: string = ctx.user?._id || '';
    const user = await UserService.get(userId, ctx);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

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
    refreshToken,
};
