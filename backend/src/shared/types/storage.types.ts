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

export interface IObjectHead {
    exists: boolean; // false when the object is not present (e.g. never uploaded)
    size?: number; // ContentLength, when it exists
    contentType?: string; // ContentType, when it exists
}

export interface IStorageProvider {
    // upload hands back a short-lived presigned PUT URL — the client uploads the bytes to S3 directly.
    upload: (input: IPresignedUploadInput) => Promise<IPresignedUpload>;
    getUrl: (identifier: string) => Promise<object>;
    delete: (identifier: string) => Promise<object>;
    headObject: (identifier: string) => Promise<IObjectHead>;
}
