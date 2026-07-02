// const success = (res: any, status: number, message: string, data: any) => {
//     return res.status(status).json({
//         success: true,
//         message,
//         data,
//     });
// };

import { object } from 'zod';

// const error = (res: any, status: number, message: string, err: any) => {
//     const msg = message || err?.message || 'Internal server error';
//     const statusCode = status || err?.statusCode || 500;

//     return res.status(statusCode).json({
//         success: false,
//         message: msg,
//         statusCode: statusCode,
//         data: err,
//     });
// };

const appResponse = (res: any, status: number = 500, success: boolean, message: string, data?: any) => {
    return res.status(status).json({
        success,
        message: message || (success ? 'Request successful' : 'Request failed'),
        data,
    });
};

const paginationResponseData = (data: object[], count: number, pagination: any) => {
    const hasNext = count > (Number.parseInt(pagination?.limit) || 10) + (pagination?.skip || 0);
    const hasPrevious = (Number.parseInt(pagination?.skip) || 0) > 0;
    const totalPages = Math.ceil(count / (Number.parseInt(pagination?.limit) || 10));
    return {
        hasNext,
        hasPrevious,
        totalPages,
    };
};

export const ResponseHandler = {
    paginationResponseData,
    appResponse,
};
