import { createUploader } from './multer';

export const csvUploader = () => {
    return createUploader(['text/csv', 'application/csv'], 10 * 1024 * 1024);
};
