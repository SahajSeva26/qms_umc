export const RoleTypeMapper = {
    toResponse: (roleType: any) => {
        return {
            id: roleType._id,
            code: roleType.code,
            name: roleType.name,
            permissions: roleType.permissions,
            category: roleType.category,
            tenant: roleType.tenant,
            status: roleType.status,
            createdAt: roleType.createdAt,
            updatedAt: roleType.updatedAt,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const r of data?.items) {
            result.items.push(RoleTypeMapper.toResponse(r));
        }
        return result;
    },
};
