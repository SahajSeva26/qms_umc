import jwt from 'jsonwebtoken';
import ENV from '../config/app.config';
import { throwAppError } from '../utils/error';
import { StatusCodes } from 'http-status-codes';

export const TokenHandler = {
    generateAccessToken: (payload: any) => {
        const tokenPayload = {
            _id: payload?._id,
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
            _id: payload?._id,
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
        if (!token) {
            throwAppError('Refresh token not found', StatusCodes.UNAUTHORIZED);
        }
        return jwt.verify(token, ENV.JWT.RefreshTokenSecret);
    },

    decodePayload: (token: string) => {
        return jwt.decode(token);
    },


};
