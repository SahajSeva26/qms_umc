import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IObjectHead, IPresignedUpload, IPresignedUploadInput, IStorageProvider } from '../../../types/storagetypes';
import ENV from '../../../config/app.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StatusCodes } from 'http-status-codes';
import { throwAppError } from '../../../utils/error';
import { logger } from '../../../utils/logger';
export const S3 = 's3';
export class S3Provider implements IStorageProvider {
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor() {
        this.client = new S3Client({
            region: ENV.Providers.AWS_S3.Region,
            endpoint: ENV.Providers.AWS_S3.S3Endpoint,
            credentials: {
                accessKeyId: ENV.Providers.AWS_S3.AccessKeyId,
                secretAccessKey: ENV.Providers.AWS_S3.SecretAccessKey,
            },
            forcePathStyle: true,
        });
        this.bucket = ENV.Providers.AWS_S3.S3Bucket;
    }

    // Uploading to S3 is done client-side via a short-lived presigned PUT URL (no bytes through the
    // API) — so "upload" hands back that URL + the key the object will land at.
    async upload(input: IPresignedUploadInput): Promise<IPresignedUpload> {
        try {
            const expiresIn = input.expiresIn ?? 3600;
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: input.key,
                ContentType: input.mimetype,
            });

            const url = await getSignedUrl(this.client, command, { expiresIn });

            return { url, key: input.key, expiresIn };
        } catch (error: any) {
            logger.error({ err: error, key: input.key }, error?.message || 'Failed to generate a presigned upload URL');
            return throwAppError('Failed to generate a presigned upload URL', StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
    async getUrl(identifier: string): Promise<object> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: identifier,
            });

            const url = await getSignedUrl(this.client, command, {
                expiresIn: 3600,
            });

            return { url };
        } catch (error: any) {
            logger.error({ err: error, identifier }, error?.message || 'Failed to generate a presigned URL');
            return throwAppError('Failed to generate a presigned URL', StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
    // Hard-deletes the object from S3. S3 delete is idempotent — deleting a missing key still succeeds,
    // so this is safe to call on an object that was never uploaded or already removed.
    async delete(identifier: string): Promise<object> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: identifier,
            });

            await this.client.send(command);

            return { success: true, key: identifier };
        } catch (error: any) {
            logger.error({ err: error, identifier }, error?.message || 'Failed to delete the storage object');
            return throwAppError('Failed to delete the storage object', StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
    // Metadata-only lookup to confirm an object actually exists (e.g. before activating a file). A
    // 404/NotFound is a normal "not uploaded yet" answer (exists: false), not an error; anything else throws.
    async headObject(identifier: string): Promise<IObjectHead> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: identifier,
            });

            const result = await this.client.send(command);
            return {
                exists: true,
                ...(result.ContentLength !== undefined ? { size: result.ContentLength } : {}),
                ...(result.ContentType !== undefined ? { contentType: result.ContentType } : {}),
            };
        } catch (error: any) {
            if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
                return { exists: false };
            }
            logger.error({ err: error, identifier }, error?.message || 'Failed to head the storage object');
            return throwAppError('Failed to verify the uploaded object', StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
