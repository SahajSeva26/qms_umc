export const BrandMapper = {
    toResponse: (brand: any) => ({
        id: brand._id?.toString(),
        tenant: brand.tenant,
        division: brand.division,
        name: brand.name,
        code: brand.code,
        description: brand.description,
        molecule: brand.molecule,
        notes: brand.notes,
        color: brand.color,
        status: brand.status,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const brand of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: brand._id?.toString(),
                tenant: brand.tenant,
                division: brand.division,
                name: brand.name,
                code: brand.code,
                description: brand.description,
                molecule: brand.molecule,
                notes: brand.notes,
                color: brand.color,
                status: brand.status,
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt,
            };
            result.items.push(item);
        }
        return result;
    },
};
