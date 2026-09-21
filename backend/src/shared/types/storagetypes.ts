export interface IUploadInput {
    buffer: Buffer;
    mimetype: string;
    key?: string;
}

export interface IPresignedUploadInput {
    key: string;
    mimetype?: string;
    expiresIn?: number; // seconds the upload URL stays valid
}

export interface IPresignedUpload {
    url: string; // the presigned PUT URL the client uploads the object to
    key: string; // the storage key the object will land at (store as the file identifier)
    expiresIn: number;
}

export interface IStorageProvider {
    upload: (input: IUploadInput) => Promise<object>;
    getUrl: (identifier: string) => Promise<object>;
    delete: (identifier: string) => Promise<object>;
    download: (identifier: string) => Promise<object>;
    getPresignedUrl: (identifier: string) => Promise<string>;
    getPresignedUploadUrl: (input: IPresignedUploadInput) => Promise<IPresignedUpload>;
}
