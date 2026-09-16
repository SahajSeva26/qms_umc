import { S3Client } from '@aws-sdk/client-s3';
import { IStorageProvider } from '../../../types/storagetypes';
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
    
    upload(input: any): Promise<object> {
        console.log('Uploading file to AWS', input);
        return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    getUrl(identifier: string): Promise<object> {
        console.log('Getting URL for AWS file', identifier);

        return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    delete(identifier: string): Promise<object> {
        console.log('Deleting AWS file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
    download(identifier: string): Promise<object> {
        console.log('Downloading AWS file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
}
