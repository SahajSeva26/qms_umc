import { IStorageProvider } from '../../../types/storagetypes';

export const AWS = 'aws';
export class AwsProvider implements IStorageProvider {
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
