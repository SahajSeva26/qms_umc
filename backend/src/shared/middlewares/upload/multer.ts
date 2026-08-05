import multer from 'multer';

// export const multerInstance = multer({
//     storage: multer.memoryStorage(),
//     limits: {
//         fileSize: 10 * 1024 * 1024, // 10MB
//     },
// });

export const createUploader = (mimeTypes: string[], fileSize: number = 10 * 1024 * 1024) => {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: fileSize, // 10MB
        },
        fileFilter: (req, file, cb) => {
            if (mimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type'));
            }
        },
    });
};
