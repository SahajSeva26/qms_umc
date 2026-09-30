import { RequestContext } from '../../../shared/utils/contextBuilder';
import { DIVISION_PERMISSIONS } from './division.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';
import { RoleMapper } from '../../access-management/role/role.mapper';

export const DivisionMapper = {
    toResponse: (division: any, ctx: RequestContext) => {
        let result: any = {
            id: division._id?.toString(),
            code: division?.code,
            name: division?.name,
            therapy: division?.therapy,
            mrCount: division?.mrCount,
            tenant: division?.tenant,

            owner: division?.owner,

            createdAt: division.createdAt,
            updatedAt: division.updatedAt,
        };
        
        if (ctx.hasAnyPermissions([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code])) {
            result.status = division.status;
            // the division head role — mapped through RoleMapper when populated (get/search;
            // a populated role carries `code`), bare id otherwise (create response)
            if (division.owner?.code) {
                result.owner = RoleMapper.toResponse(division.owner);
            } else {
                result.owner = division.owner?._id ?? division.owner;
            }
        }
        return result;
    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        const stats = data?.stats;
        for (const d of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: d._id?.toString(),
                code: d?.code,
                name: d?.name,
                therapy: d?.therapy,
                mrCount: d?.mrCount,
                tenant: d?.tenant,

                owner: d?.owner,

                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            };

            if (ctx.hasAnyPermissions([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code])) {
                item.status = d.status;
                // the division head role — mapped through RoleMapper when populated (get/search;
                // a populated role carries `code`), bare id otherwise (create response)
                if (d.owner?.code) {
                    item.owner = RoleMapper.toResponse(d.owner);
                } else {
                    item.owner = d.owner?._id ?? d.owner;
                }
            }
            // present only when the caller requested report=true
            if (stats) {
                item.stats = stats[d._id?.toString()] ?? { totalProjects: 0, liveProjects: 0 };
            }
            result.items.push(item);
        }
        return result;
    },
};
