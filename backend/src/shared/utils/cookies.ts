import { Response, Request } from 'express';
import ENV from '../config/app.config';
import { AUTH_TOKENS } from '../../modules/auth/auth.constants';

const isProduction = ENV.App.Environment === 'production';

// In production the frontend is typically on a DIFFERENT domain than the API, so the
// auth cookie must be cross-site: sameSite:'none' REQUIRES secure:true (HTTPS), which
// Railway provides. In dev (localhost) we stay on 'lax' over plain HTTP.
const BASE_COOKIE_OPTS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
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
        // clearCookie only removes the cookie if the attributes match how it was set —
        // a bare clearCookie(key) fails to clear a sameSite:'none'; secure cookie, so
        // pass the same base options (logout would otherwise silently do nothing in prod)
        res.clearCookie(key, BASE_COOKIE_OPTS);
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
