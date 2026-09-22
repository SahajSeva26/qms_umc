import { IStorageProvider } from '../../types/storagetypes';
import { CLOUDINARY, CloudinaryProvider } from './cloudinary/cloudinary';
import { S3, S3Provider } from './aws/s3.provider';

class StorageManager {
    private readonly providers: Map<string, IStorageProvider> = new Map();

    constructor() {
        this.providers.set(CLOUDINARY, new CloudinaryProvider());
        this.providers.set(S3, new S3Provider());
    }

    get(name: string): IStorageProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Storage provider ${name} not found`);
        }
        return provider;
    }
}

export const storageManager = new StorageManager();
