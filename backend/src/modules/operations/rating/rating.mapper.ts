// Rating Mapper
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

const mapRating = (rating: any) => ({
    id: rating._id?.toString(),
    camp: mapRef(rating.camp, (c) => ({ code: c.code, date: c.date, status: c.status, type: c.type })),
    worker: mapRef(rating.worker, (r) => ({ name: r.name, code: r.code })),
    ratedBy: mapRef(rating.ratedBy, (r) => ({ name: r.name, code: r.code })),
    tenant: mapRef(rating.tenant, (t) => ({ name: t.name, code: t.code })),
    onTime: rating.onTime,
    attire: rating.attire,
    communication: rating.communication,
    overall: rating.overall,
    ratedAt: rating.ratedAt,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
});

export const RatingMapper = {
    toResponse: (rating: any, ctx: RequestContext) => mapRating(rating),
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now so search
        // rows can be trimmed later without affecting GET /:id.
        for (const rating of data?.items || []) {
            result.items.push(mapRating(rating));
        }
        return result;
    },
};
