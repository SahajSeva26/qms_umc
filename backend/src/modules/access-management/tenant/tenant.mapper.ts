import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { RequestContext } from '../../../shared/utils/contextBuilder';

export const TenantMapper = {
    toResponse: (tenant: any, ctx: RequestContext) => {
        let result: any = {
            id: tenant._id?.toString(),
            code: tenant.code,
            name: tenant.name,
            address: tenant.address ?? null,
            businessLifetime: tenant.businessLifetime ?? null,
            gst: tenant.gst ?? null,
        };
        if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
            result.status = tenant.status;
            result.owner = tenant.owner;
            result.salesPerson = tenant.salesPerson ?? null;
            result.createdAt = tenant.createdAt;
            result.updatedAt = tenant.updatedAt;
            result.type = tenant.type;
        }
        return result;
    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        const stats = data?.stats;
        for (const t of data?.items || []) {
            // NOTE: independent from toResponse on purpose — search rows can be
            // trimmed to a lighter subset later without affecting GET /:id.
            // For now this mirrors toResponse field-for-field (incl. the same
            // permission gating) so nothing breaks.
            const item: any = {
                id: t._id?.toString(),
                code: t.code,
                name: t.name,
                address: t.address ?? null,
                businessLifetime: t.businessLifetime ?? null,
                gst: t.gst ?? null,
            };
            if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
                item.status = t.status;
                item.owner = t.owner;
                item.salesPerson = t.salesPerson ?? null;
                item.createdAt = t.createdAt;
                item.updatedAt = t.updatedAt;
                item.type = t.type;
            }
            // only present when the caller requested report=true
            if (stats) {
                item.stats = stats[t._id?.toString()] ?? {
                    totalProjects: 0,
                    liveProjects: 0,
                    totalCamps: 0,
                    liveCamps: 0,
                    screeningCamps: 0,
                    dietCamps: 0,
                };
            }
            result.items.push(item);
        }
        return result;
    },
};
