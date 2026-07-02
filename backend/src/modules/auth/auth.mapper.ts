import { HydratedDocument } from "mongoose";
import { IUser } from "../user/user.model";

export const AuthMapper = {
    toResponse: (user: HydratedDocument<IUser>) => {
        return {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
        };
    },
};
