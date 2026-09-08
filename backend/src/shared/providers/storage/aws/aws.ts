
import { IStorageProvider } from "../../../types/storagetypes";

export const AWS = 'aws';
export class AwsProvider implements IStorageProvider {
    upload(input: any): Promise<object> {
        throw new Error('Method not implemented.');
    }
    getUrl(identifier: string): Promise<object> {
        throw new Error('Method not implemented.');
    }
    delete(identifier: string): Promise<object> {
        throw new Error('Method not implemented.');
    }
    download(identifier: string): Promise<object> {
        throw new Error('Method not implemented.');
    }
}
