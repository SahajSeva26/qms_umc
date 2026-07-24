import pino from 'pino';

export const serializers = {
    err: pino.stdSerializers.err,

    req(req: any) {
        return {
            id: req.id,
            method: req.method,
            // originalUrl = full path incl. query; req.url gets rewritten by routers.
            url: req.originalUrl ?? req.url,
            ip: req.ip,
        };
    },

    res(res: any) {
        return {
            statusCode: res.statusCode,
        };
    },
};
