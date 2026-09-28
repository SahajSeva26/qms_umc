import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createUploader } from './multer';
import { ResponseHandler } from '../../utils/responseHandler';

const uploader = createUploader(['image/jpeg', 'image/png', 'application/pdf'], 10 * 1024 * 1024);

// Multer runs before the controller, so an upload error (invalid file type, file too large, too
// many files, ...) never reaches the controller's try/catch — it would bubble up to Express's
// default handler as a 500. Wrap the multer middleware so any such error is returned as a clean 400.
const withErrorHandling = (mw: RequestHandler): RequestHandler => {
    return (req, res, next) => {
        mw(req, res, (err: any) => {
            if (err) {
                return ResponseHandler.appResponse(
                    res,
                    StatusCodes.BAD_REQUEST,
                    false,
                    err?.message || 'Invalid file upload',
                    null,
                );
            }
            next();
        });
    };
};

export const imageUploader = {
    array: (field: string, maxCount?: number) => withErrorHandling(uploader.array(field, maxCount)),
    single: (field: string) => withErrorHandling(uploader.single(field)),
};
