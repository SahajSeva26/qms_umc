// File Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';
import { FILE_PERMISSIONS } from './file.constants';

// Only a file:manage actor sees the raw storage coordinates (provider / path / identifier); everyone
// else gets the presentational metadata + presigned url only. The check reads ctx.permissions.
export const FileMapper = {
    toResponse: (file: any, ctx?: RequestContext) => {
        const canManage = ctx?.hasAnyPermissions([FILE_PERMISSIONS.MANAGE.code]) ?? false;

        return {
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

            // storage metadata — raw coordinates (provider/path/identifier) are file:manage only
            content: file.content
                ? {
                      ...(canManage
                          ? {
                                provider: file.content.provider,
                                path: file.content.path,
                                identifier: file.content.identifier,
                            }
                          : {}),
                      originalName: file.content.originalName,
                      displayName: file.content.displayName,
                      mimeType: file.content.mimeType,
                      extension: file.content.extension,
                      size: file.content.size,
                  }
                : null,

            // short-lived presigned URL — attached by the service (FileService withUrl)
            url: file.url ?? null,

            tags: file.tags || [],

            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx?: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const file of data?.items || []) {
            result.items.push(FileMapper.toResponse(file, ctx));
        }
        return result;
    },
};
