import { IObjectHead, IPresignedUpload, IPresignedUploadInput, IStorageProvider } from '../../../types/storage.types';

export const CLOUDINARY = 'cloudinary';
export class CloudinaryProvider implements IStorageProvider {
    upload(input: IPresignedUploadInput): Promise<IPresignedUpload> {
        console.log('Uploading file to Cloudinary', input);
        return Promise.resolve({ url: 'https://example.com', key: input.key, expiresIn: input.expiresIn ?? 3600 });
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
    headObject(identifier: string): Promise<IObjectHead> {
        console.log('Heading Cloudinary object', identifier);
        return Promise.resolve({ exists: true });
        // throw new Error('Method not implemented.');
    }
}
