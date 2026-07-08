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
                // ...tokenPayload,
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
