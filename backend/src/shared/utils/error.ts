import { ZodError } from 'zod';

export class AppError extends Error {
    statusCode: number;
    success: boolean;
    isOperational: boolean;
    extra?: Record<string, any>;

    constructor(message: string, statusCode: number = 500, extra: Record<string, any> = {}) {
        super(message);

        this.statusCode = statusCode;
        this.success = false;
        this.isOperational = true; // helps distinguish expected vs unknown errors
        this.extra = extra;

        this.name = 'AppError';

        Error.captureStackTrace(this, this.constructor);
    }
}
export const throwAppError = (
    message: string,
    statusCode: number = 500,
    extra: Record<string, any> = {},
): never => {
    throw new AppError(message, statusCode, extra);
};

export const formatZodError = (error: ZodError) => {
    const fieldErrors: Record<string, string> = {};

    error.issues.forEach((issue: any) => {
        const field = issue.path.join('.'); // supports nested fields
        fieldErrors[field] = issue.message;
    });

    return fieldErrors;
};
