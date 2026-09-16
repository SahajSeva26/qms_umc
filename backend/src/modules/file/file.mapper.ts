// File Mapper
import { storageManager } from '../../shared/providers/storage/storage';
import { S3 } from '../../shared/providers/storage/aws/s3.provider';

// Generate a short-lived, read-only presigned URL for the stored object. Failures are swallowed to
// null so one unreachable object never breaks a whole listing — the error is already logged by the
// provider.
const presign = async (content: any): Promise<string | null> => {
    if (!content?.identifier) {
        return null;
    }
    try {
        return await storageManager.get(content.provider || S3).getPresignedUrl(content.identifier);
    } catch {
        return null;
    }
};

export const FileMapper = {
    toResponse: async (file: any) => ({
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

        // short-lived presigned URL to fetch the object directly from storage
        url: await presign(file.content),

        tags: file.tags || [],

        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    }),
    toSearchResponse: async (data: { count: number; items: any[] }) => {
        const items = await Promise.all(
            (data?.items || []).map((file) => FileMapper.toResponse(file)),
        );
        return {
            count: data?.count || 0,
            items,
        };
    },
};
