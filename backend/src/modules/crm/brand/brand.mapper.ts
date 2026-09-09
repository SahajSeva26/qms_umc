export const BrandMapper = {
    toResponse: (brand: any) => ({
        id: brand._id?.toString(),
        tenant: brand.tenant,
        division: brand.division,
        name: brand.name,
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
            result.items.push(BrandMapper.toResponse(brand));
        }
        return result;
    },
};
