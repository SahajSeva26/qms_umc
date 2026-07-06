const parseQuery = (req: any) => {
    let query: Record<string, any> = {};

    Object.entries(req.query).forEach(([key, value]) => {
        query[key] = value;
    });

    return query;
};

const getPagination = (req: any) => {
    return {
        page: Number.parseInt(req.query.page || '1'),
        limit: Number.parseInt(req.query.limit || '10'),
        skip: (Number.parseInt(req.query.page || '1') - 1) * Number.parseInt(req.query.limit || '10'),
    };
};

export const RequestHandler = {
    parseQuery,
    getPagination,
};
