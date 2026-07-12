import { RequestContext } from "../../../shared/utils/contextBuilder";
import { TENANT_PERMISSIONS } from "../tenant/tenant.constants";

export const RoleTypeMapper = {
    toResponse: (roleType: any, ctx: RequestContext) => {

        let result: any = {
            id: roleType._id,
            code: roleType.code,
            name: roleType.name,
            description: roleType.description,
            permissions: roleType.permissions,
            tenant: roleType.tenant,
            createdAt: roleType.createdAt,
            updatedAt: roleType.updatedAt,
        }
        if (ctx.hasAnyPermissions([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code])) {
            result.status = roleType.status;
        }
        return result

    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result: any = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const r of data?.items) {
            result.items.push(RoleTypeMapper.toResponse(r, ctx));
        }
        return result;
    },
};
