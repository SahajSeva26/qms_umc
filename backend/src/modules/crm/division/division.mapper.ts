import { RequestContext } from '../../../shared/utils/contextBuilder';
import { DIVISION_PERMISSIONS } from './division.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';
import { RoleMapper } from '../../access-management/role/role.mapper';

export const DivisionMapper = {
    toResponse: (division: any, ctx: RequestContext) => {
        let result: any = {
            id: division._id?.toString(),
            code: division.code,
            name: division.name,
            therapy: division.therapy,
            brandFocus: division.brandFocus,
            mrCount: division.mrCount,
            tenant: division.tenant,

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
        for (const d of data?.items || []) {
            result.items.push(DivisionMapper.toResponse(d, ctx));
        }
        return result;
    },
};
