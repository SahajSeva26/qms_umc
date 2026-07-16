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

    // the "who am I" session shape the frontend uses to hydrate + guard routes
    toSession: (data: { user: HydratedDocument<IUser>; role: any; tenant: any; permissions: string[] }) => {
        const { user, role, tenant, permissions } = data;
        const roleType = role?.type;

        return {
            user: AuthMapper.toResponse(user),
            role: role
                ? {
                      id: role._id?.toString(),
                      code: role.code,
                      name: role.name,
                  }
                : null,
            roleType: roleType
                ? {
                      id: roleType._id?.toString(),
                      code: roleType.code,
                      name: roleType.name,
                  }
                : null,
            tenant: tenant
                ? {
                      id: tenant._id?.toString(),
                      code: tenant.code,
                      name: tenant.name,
                      type: tenant.type,
                  }
                : null,
            // flat list of permission codes — frontend guards check this (e.g. includes('lead:read'))
            permissions: permissions || [],
        };
    },
};
