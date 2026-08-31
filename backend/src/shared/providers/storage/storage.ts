import { IStorageProvider, IUploadInput } from '../../types/storagetypes';
import { CLOUDINARY, CloudinaryProvider } from './cloudinary/cloudinary';

class StorageManager {
    private readonly providers: Map<string, IStorageProvider> = new Map();

    constructor() {
        this.providers.set(CLOUDINARY, new CloudinaryProvider());
    }

    get(name: string = CLOUDINARY): IStorageProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Storage provider ${name} not found`);
        }
        return provider;
    }
}

export const storageManager = new StorageManager();
