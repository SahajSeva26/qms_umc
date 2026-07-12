import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { TENANT_PERMISSIONS } from '../tenant/tenant.constants';

export const PermissionGroupMapper = {
    toResponse: (entity: any, ctx: RequestContext) => {
        let result: any = {
            id: entity._id,
            code: entity.code,
            name: entity.name,
            description: entity.description,
            tenant: entity.tenant,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
        if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code,TENANT_PERMISSIONS.ADMIN.code])) {
            // Add permissions if user has view permission
            result.status = entity.status;
            result.permissions = entity.permissions ?? [];
        }
        return result;
    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const pg of data?.items) {
            result.items.push(PermissionGroupMapper.toResponse(pg, ctx));
        }
        return result;
    },
};
