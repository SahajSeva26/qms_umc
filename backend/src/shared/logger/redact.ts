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

        // Logged request body (httpLogger customProps → `payload`). Each field is
        // listed at the top level AND one level nested (payload.*.<field>) so
        // sub-objects like `owner` are covered (e.g. payload.owner.password).
        'payload.password',
        'payload.*.password',
        'payload.currentPassword',
        'payload.*.currentPassword',
        'payload.newPassword',
        'payload.*.newPassword',
        'payload.confirmPassword',
        'payload.*.confirmPassword',
        'payload.oldPassword',
        'payload.*.oldPassword',
        'payload.token',
        'payload.*.token',
        'payload.accessToken',
        'payload.*.accessToken',
        'payload.refreshToken',
        'payload.*.refreshToken',
    ],
    censor: '[REDACTED]',
};
