import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IStorageProvider, IUploadInput } from '../../../types/storagetypes';
import ENV from '../../../config/app.config';

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

    async upload(input: IUploadInput): Promise<object> {
        console.log('Uploading file to AWS', input);
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: input.key,
            Body: input.buffer,
            ContentType: input.mimetype,
        });

        await this.client.send(command);

        return {
            provider: S3,
            key: input.key,
            identifier: input.key,
            path: input.key,
        };
        // return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    async getUrl(identifier: string): Promise<object> {
        console.log('Getting URL for AWS file', identifier);

        return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    async delete(identifier: string): Promise<object> {
        console.log('Deleting AWS file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
    async download(identifier: string): Promise<object> {
        console.log('Downloading AWS file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
}
