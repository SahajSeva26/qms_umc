import { IPresignedUpload, IPresignedUploadInput, IStorageProvider } from '../../../types/storagetypes';

export const CLOUDINARY = 'cloudinary';
export class CloudinaryProvider implements IStorageProvider {
    upload(input: any): Promise<object> {
        console.log('Uploading file to Cloudinary', input);
        return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    getUrl(identifier: string): Promise<object> {
        console.log('Getting URL for Cloudinary file', identifier);
        return Promise.resolve({ url: 'https://example.com' });
        // throw new Error('Method not implemented.');
    }
    delete(identifier: string): Promise<object> {
        console.log('Deleting Cloudinary file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
    download(identifier: string): Promise<object> {
        console.log('Downloading Cloudinary file', identifier);
        return Promise.resolve({ success: true });
        // throw new Error('Method not implemented.');
    }
    getPresignedUrl(identifier: string): Promise<string> {
        console.log('Getting presigned URL for Cloudinary file', identifier);
        return Promise.resolve('https://example.com');
        // throw new Error('Method not implemented.');
    }
    getPresignedUploadUrl(input: IPresignedUploadInput): Promise<IPresignedUpload> {
        console.log('Getting presigned upload URL for Cloudinary file', input);
        return Promise.resolve({ url: 'https://example.com', key: input.key, expiresIn: input.expiresIn ?? 3600 });
        // throw new Error('Method not implemented.');
    }
}
