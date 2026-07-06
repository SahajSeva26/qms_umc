import { Response, Request } from 'express';
import ENV from '../config/app.config';
import { AUTH_TOKENS } from '../../modules/auth/auth.constants';

const BASE_COOKIE_OPTS = {
    httpOnly: true,
    secure: ENV.App.Environment === 'production',
    sameSite: 'strict' as const,
};

export const CookieHandler = {
    get: (req: Request, key: string) => {
        return req.cookies[key];
    },
    set: (res: Response, key: string, value: string) => {
        res.cookie(key, value, {
            ...BASE_COOKIE_OPTS,
            maxAge: ENV.JWT.AccessTokenExpirySec * 1000,
        });
    },
    clear: (res: Response, key: string) => {
        res.clearCookie(key);
    },

    // ===========IMP==========================
    setAccessToken: (res: Response, token: string) => {
        res.cookie(AUTH_TOKENS.ACCESS_TOKEN, token, {
            ...BASE_COOKIE_OPTS,
            maxAge: ENV.JWT.AccessTokenExpirySec * 1000,
        });
    },
    setRefreshToken: (res: Response, token: string) => {
        res.cookie(AUTH_TOKENS.REFRESH_TOKEN, token, {
            ...BASE_COOKIE_OPTS,
            maxAge: ENV.JWT.RefreshExpirySec * 1000,
        });
    },
};
