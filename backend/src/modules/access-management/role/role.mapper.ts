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
            supervisor: role.supervisor,
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
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: r._id,
                code: r.code,
                name: r.name,
                description: r.description,
                permissions: r.permissions,
                status: r.status,
                type: r.type,
                user: r.user,
                tenant: r.tenant,
                division: r.division,
                supervisor: r.supervisor,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            };
            result.items.push(item);
        }
        return result;
    },
};
