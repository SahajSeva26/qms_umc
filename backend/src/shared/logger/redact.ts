export const redact = {
    paths: [
        'password',
        'confirmPassword',
        'oldPassword',
        'newPassword',

        'accessToken',
        'refreshToken',

        'req.headers.authorization',
        'req.headers.cookie',

        'secret',
        'apiKey',
    ],
    censor: '[REDACTED]',
};
