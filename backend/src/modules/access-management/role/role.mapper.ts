export const RoleMapper = {
    toResponse: (role: any) => {
        return {
            id: role._id,
            code: role.code,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            status: role.status,
            type: role.type,
            user: role.user,
            tenant: role.tenant,
            division: role.division,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const r of data?.items) {
            result.items.push(RoleMapper.toResponse(r));
        }
        return result;
    },
};
