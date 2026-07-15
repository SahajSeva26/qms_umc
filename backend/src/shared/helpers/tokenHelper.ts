import jwt from 'jsonwebtoken';
import ENV from '../config/app.config';
import { throwAppError } from '../utils/error';
import { StatusCodes } from 'http-status-codes';
import { ContextUser } from '../utils/contextBuilder';

export interface ITokenPayload {
    _id: string;
    email: string;
    role: string;
    tenant: string;
}

export const TokenHandler = {
    generateAccessToken: (payload: ITokenPayload) => {
        const token: any = jwt.sign(
            {
                ...payload,
            },
            ENV.JWT.AccessTokenSecret,
            {
                expiresIn: ENV.JWT.AccessTokenExpirySec,
            },
        );

        return token;
    },

    generateRefreshToken: (payload: any) => {
        const token: any = jwt.sign(
            {
                ...payload,
            },
            ENV.JWT.RefreshTokenSecret,
            {
                expiresIn: ENV.JWT.RefreshExpirySec,
            },
        );

        return token;
    },

    verifyAccessToken: (token: string) => {
        if (!token) {
            throwAppError('Access token not found', StatusCodes.UNAUTHORIZED);
        }
        try {
            return jwt.verify(token, ENV.JWT.AccessTokenSecret);
        } catch (error) {
            throwAppError('Invalid or expired access token', StatusCodes.UNAUTHORIZED);
        }
    },

    verifyRefreshToken: (token: string) => {
        if (!token) {
            throwAppError('Refresh token not found', StatusCodes.UNAUTHORIZED);
        }
        try {
            return jwt.verify(token, ENV.JWT.RefreshTokenSecret);
        } catch (error) {
            throwAppError('Invalid or expired refresh token', StatusCodes.UNAUTHORIZED);
        }
    },

    decodePayload: (token: string): ITokenPayload => {
        if (!token) {
            throwAppError('Token not found', StatusCodes.UNAUTHORIZED);
        }
        return jwt.decode(token) as ITokenPayload;
    },
};
