export type IUploadInput = {
    buffer: Buffer;
    mimetype: string;
    folder?: string;
};

export interface IStorageProvider {
    upload: (input: IUploadInput) => Promise<object>;
    getUrl: (identifier: string) => Promise<object>;
    delete: (identifier: string) => Promise<object>;
    download: (identifier: string) => Promise<object>;
}
