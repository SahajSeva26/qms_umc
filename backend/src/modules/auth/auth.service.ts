import { HydratedDocument } from 'mongoose';
import { UserService } from '../user/user.service';
import { ILoginUserPayload, IRegisterUserPayload } from './auth.validators';
import { IUser } from '../user/user.model';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { TokenHandler } from '../../shared/helpers/tokenHelper';
import { RequestContext } from '../../shared/utils/contextBuilder';

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
    await user.save();

    // 5: generate tokens
    const accessToken = TokenHandler.generateAccessToken(user);
    const refreshToken = TokenHandler.generateRefreshToken(user);

    return {
        user,
        accessToken,
        refreshToken,
    };
};

export const AuthService = {
    register,
    login,
};
