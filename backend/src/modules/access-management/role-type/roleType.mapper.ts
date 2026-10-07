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
            isSystem: roleType.isSystem,
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
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: r._id,
                code: r.code,
                name: r.name,
                description: r.description,
                permissions: r.permissions,
                isSystem: r.isSystem,
                tenant: r.tenant,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            };
            if (ctx.hasAnyPermissions([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code])) {
                item.status = r.status;
            }
            result.items.push(item);
        }
        return result;
    },
};
