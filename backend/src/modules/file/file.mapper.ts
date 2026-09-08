// File Mapper
export const FileMapper = {
    toResponse: (file: any) => ({
        id: file._id?.toString(),

        // owning tenant (populated { name, code } when requested, else the raw id)
        tenant: file.tenant,

        // the record this file hangs off, and in what role
        entity: {
            id: file.entity?.id,
            type: file.entity?.type,
            relation: file.entity?.relation,
        },

        // classification + lifecycle
        type: file.type,
        status: file.status,

        // the role that registered the file (populated { name, code } when requested, else raw id)
        owner: file.owner,

        // storage metadata
        content: file.content
            ? {
                  provider: file.content.provider,
                  path: file.content.path,
                  identifier: file.content.identifier,
                  originalName: file.content.originalName,
                  displayName: file.content.displayName,
                  mimeType: file.content.mimeType,
                  extension: file.content.extension,
                  size: file.content.size,
              }
            : null,

        tags: file.tags || [],

        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const file of data?.items || []) {
            result.items.push(FileMapper.toResponse(file));
        }
        return result;
    },
};
