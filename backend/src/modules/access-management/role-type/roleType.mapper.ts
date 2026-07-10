import { SYSTEM_PERMISSIONS } from "../../../shared/env/permissions";
import { RequestContext } from "../../../shared/utils/contextBuilder";
import { ROLE_TYPE_PERMISSIONS } from "./roleType.constants";

export const RoleTypeMapper = {
    toResponse: (roleType: any,ctx :RequestContext) => {

        let result:any={
            id: roleType._id,
            code: roleType.code,
            name: roleType.name,
            permissions: roleType.permissions,
            category: roleType.category,
            tenant: roleType.tenant,
            createdAt: roleType.createdAt,
            updatedAt: roleType.updatedAt,
        }
        if(ctx.hasAnyPermissions([ROLE_TYPE_PERMISSIONS.MANAGE.code])){
            result.status = roleType.status;
        }
        return result
            
    },
    toSearchResponse: (data: any,ctx :RequestContext) => {
        const result:any = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const r of data?.items) {
            result.items.push(RoleTypeMapper.toResponse(r,ctx));
        }
        return result;
    },
};
