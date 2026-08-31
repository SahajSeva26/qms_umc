// Test Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';

// resolve a possibly-populated ref to a plain response shape
const mapRef = (ref: any, extra: (r: any) => object = () => ({})) => {
    if (!ref) {
        return null;
    }
    if (ref._id) {
        return { id: ref._id.toString(), ...extra(ref) };
    }
    return { id: ref.toString() };
};

const mapResult = (result: any) => {
    if (!result) {
        return null;
    }
    return {
        key: result.key,
        value: result.value,
        unit: result.unit,
        interpretation: result.interpretation,
    };
};

export const TestMapper = {
    toResponse: (test: any, ctx: RequestContext) => {
        return {
            id: test._id?.toString(),

            tenant: mapRef(test.tenant, (t) => ({ name: t.name, code: t.code })),
            screening: mapRef(test.screening, (s) => ({ status: s.status })),
            type: mapRef(test.type, (t) => ({ code: t.code, name: t.name, therapy: t.therapy })),

            result: mapResult(test.result),
            performedBy: mapRef(test.performedBy, (r) => ({ name: r.name, code: r.code })),

            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
        };
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const test of data?.items || []) {
            result.items.push(TestMapper.toResponse(test, ctx));
        }
        return result;
    },
};
