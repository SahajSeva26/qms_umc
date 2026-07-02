import jwt from 'jsonwebtoken';
import ENV from '../config/app.config';

export const TokenHandler = {
    generateAccessToken: (payload: any) => {
        const tokenPayload = {
            _id: payload?.id,
            email: payload?.email,
        };

        const token: any = jwt.sign(
            {
                ...tokenPayload,
            },
            ENV.JWT.AccessTokenSecret,
            {
                expiresIn: ENV.JWT.AccessTokenExpirySec,
            },
        );

        return token;
    },

    generateRefreshToken: (payload: any) => {
        const tokenPayload = {
            _id: payload?.id,
            email: payload?.email,
        };

        const token: any = jwt.sign(
            {
                ...tokenPayload,
            },
            ENV.JWT.RefreshTokenSecret,
            {
                expiresIn: ENV.JWT.RefreshExpirySec,
            },
        );

        return token;
    },

    verifyAccessToken: (token: string) => {
        return jwt.verify(token, ENV.JWT.AccessTokenSecret);
    },

    verifyRefreshToken: (token: string) => {
        return jwt.verify(token, ENV.JWT.RefreshTokenSecret);
    },
};
