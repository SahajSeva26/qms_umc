export const PermissionGroupMapper = {
    toResponse: (doc: any) => {
        return {
            id: doc._id,
            code: doc.code,
            name: doc.name,
            description: doc.description,
            status: doc.status,
            permissions: doc.permissions ?? [],
            tenant: doc.tenant,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const pg of data?.items) {
            result.items.push(PermissionGroupMapper.toResponse(pg));
        }
        return result;
    },
};
