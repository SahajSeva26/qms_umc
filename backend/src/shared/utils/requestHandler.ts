const parseQuery = (req: any) => {
    let query: Record<string, any> = {};

    Object.entries(req.query).forEach(([key, value]) => {
        query[key] = value;
    });

    return query;
};

const getPagination = (filters: any) => {
    return {
        page: Number.parseInt(filters.page || '1'),
        limit: Number.parseInt(filters.limit || '10'),
        skip: (Number.parseInt(filters.page || '1') - 1) * Number.parseInt(filters.limit || '10'),
    };
};

export const RequestHandler = {
    parseQuery,
    getPagination,
};
