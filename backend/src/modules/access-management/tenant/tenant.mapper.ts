import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { RequestContext } from '../../../shared/utils/contextBuilder';

export const TenantMapper = {
    toResponse: (tenant: any, ctx: RequestContext) => {
        let result: any = {
            id: tenant._id?.toString(),
            code: tenant.code,
            name: tenant.name,
        };
        if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
            result.status = tenant.status;
            result.owner = tenant.owner;
            result.createdAt = tenant.createdAt;
            result.updatedAt = tenant.updatedAt;
        }
        return result;
    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const t of data?.items || []) {
            result.items.push(TenantMapper.toResponse(t, ctx));
        }
        return result;
    },
};
