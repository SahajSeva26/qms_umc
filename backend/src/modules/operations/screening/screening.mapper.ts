// Screening Mapper
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

// consent is exposed WITHOUT the OTP — the OTP is server-side match material and is never returned.
const mapConsent = (consent: any) => {
    if (!consent) {
        return null;
    }
    return {
        verified: consent.verified,
        signature: consent.signature,
    };
};

const mapStageEntry = (e: any) => ({
    from: e.from,
    to: e.to,
    reason: e.reason,
    actor: e.actor ? { roleId: e.actor.roleId?.toString(), name: e.actor.name, email: e.actor.email } : null,
    at: e.createdAt,
});

export const ScreeningMapper = {
    toResponse: (screening: any, ctx: RequestContext) => {
        return {
            id: screening._id?.toString(),

            tenant: mapRef(screening.tenant, (t) => ({ name: t.name, code: t.code })),
            patient: mapRef(screening.patient, (p) => ({
                code: p.code,
                firstName: p.firstName,
                middleName: p.middleName,
                lastName: p.lastName,
                mobile: p.mobile,
            })),
            camp: mapRef(screening.camp, (c) => ({ code: c.code, date: c.date, status: c.status })),
            performedBy: mapRef(screening.performedBy, (r) => ({ name: r.name, code: r.code })),

            symptoms: screening.symptoms || [],
            referral: screening.referral,
            consent: mapConsent(screening.consent),
            status: screening.status,
            stageHistory: (screening.stageHistory || []).map(mapStageEntry),

            createdAt: screening.createdAt,
            updatedAt: screening.updatedAt,
        };
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const screening of data?.items || []) {
            result.items.push(ScreeningMapper.toResponse(screening, ctx));
        }
        return result;
    },
};
