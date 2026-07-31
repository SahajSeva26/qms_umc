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
            brandFocus: division?.brandFocus,
            mrCount: division?.mrCount,
            tenant: division?.tenant,

            owner: division?.owner,

            createdAt: division.createdAt,
            updatedAt: division.updatedAt,
        };
        
        if (ctx.hasAnyPermissions([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code])) {
            result.status = division.status;
            // the division head role — mapped when populated (get/search), bare id otherwise (create)
            result.owner = division.owner?._id ? division.owner._id : division.owner;
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
