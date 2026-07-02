import { StatusCodes } from "http-status-codes";
import { formatZodError } from "../../shared/utils/error";
import { ResponseHandler } from "../../shared/utils/responseHandler";
import { UserService } from "../user/user.service";
import { RegisterPayloadSchema } from "../user/user.validators";
import { Request, Response, RequestHandler } from "express";
import { userMapper } from "../user/user.mapper";

 const register = async (req: Request, res: Response) => {
    try {
        const { data, success, error } = RegisterPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);

            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const user = await UserService.create(data);

        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'User registered successfully', userMapper.toResponse(user));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const AuthController = {
    register,
};
