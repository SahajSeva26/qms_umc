import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { TokenHandler } from '../helpers/tokenHelper';

export const AuthMiddleware = (req: any, res: any, next: any) => {
    try {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            return ResponseHandler.appResponse(res, StatusCodes.UNAUTHORIZED, false, 'Unauthorized', null);
        }

        const isValid = TokenHandler.verifyAccessToken(accessToken);

        if (!isValid) {
            return ResponseHandler.appResponse(res, StatusCodes.UNAUTHORIZED, false, 'Unauthorized', null);
        }

        // Set context data
        req.context.setUser(isValid);

        next();
    } catch (error) {
        return ResponseHandler.appResponse(res, StatusCodes.UNAUTHORIZED, false, 'Unauthorized', null);
    }
};
