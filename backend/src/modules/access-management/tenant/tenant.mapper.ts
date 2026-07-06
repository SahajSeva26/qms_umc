export const TenantMapper = {
    toResponse: (tenant: any) => {
        return {
            id: tenant._id,
            code: tenant.code,
            name: tenant.name,
            owner: tenant.owner,
            status: tenant.status,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const t of data?.items) {
            result.items.push(TenantMapper.toResponse(t));
        }
        return result;
    },
};
