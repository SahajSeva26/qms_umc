import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { TENANT_PERMISSIONS } from './tenant.constants';
import { LEAD_PERMISSIONS } from '../../crm/lead/lead.constants';
import { RequestContext } from '../../../shared/utils/contextBuilder';

export const TenantMapper = {
    toResponse: (tenant: any, ctx: RequestContext) => {
        let result: any = {
            id: tenant._id?.toString(),
            code: tenant.code,
            name: tenant.name,
        };
        // `type` (platform vs customer) is needed by any caller building a Lead —
        // the salesPerson picker has to identify the platform tenant to only
        // offer QMS-internal Roles (see lead.service.ts's `salesPerson must be
        // QMS internal staff` rule) — so lead:manage/tenant:manage also unlock
        // it, not just system:manage. The rest (status/owner/timestamps) stay
        // gated to system:manage; they're not needed outside tenant administration.
        if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code, LEAD_PERMISSIONS.MANAGE.code])) {
            result.type = tenant.type;
        }
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
