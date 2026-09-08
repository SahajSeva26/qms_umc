import { createUploader } from './multer';

export const imageUploader = createUploader(['image/jpeg', 'image/pdf'], 10 * 1024 * 1024);
