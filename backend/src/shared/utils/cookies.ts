import { Response, Request } from 'express';
import ENV from '../config/app.config';

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

const BASE_COOKIE_OPTS = {
    httpOnly: true,
    secure: ENV.App.Environment === 'production',
    sameSite: 'strict' as const,
};

export const setAccessCookie = (res: any, token: string) => {
    res.cookie(ACCESS_COOKIE_NAME, token, {
        ...BASE_COOKIE_OPTS,
        maxAge: ENV.JWT.AccessTokenExpirySec * 1000,
    });
};

export const setRefreshCookie = (res: any, token: string) => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...BASE_COOKIE_OPTS,
        maxAge: ENV.JWT.RefreshExpirySec * 1000,
    });
};

export const clearAuthCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE_NAME);
    res.clearCookie(REFRESH_COOKIE_NAME);
};
