// Doctor Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { DOCTOR_PERMISSIONS } from './doctor.constants';

export const DoctorMapper = {
    toResponse: (doctor: any, ctx: RequestContext) => {
        const result: any = {
            id: doctor._id?.toString(),

            // owning tenant (populated { name, code } when requested, else the raw id)
            tenant: doctor.tenant,

            // owning division (populated { name, code, therapy } when requested, else the raw id)
            division: doctor.division,

            // identity
            pharmaCode: doctor.pharmaCode,
            name: doctor.name,
            specialization: doctor.specialization,

            // contact
            mobile: doctor.mobile,
            email: doctor.email,

            // full postal address + geo point (embedded, same shape as camp's location)
            location: doctor.location || null,

            createdAt: doctor.createdAt,
            updatedAt: doctor.updatedAt,
        };
        if (ctx.hasAnyPermissions([DOCTOR_PERMISSIONS.MANAGE.code])) {
            result.status = doctor.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[]; stats?: Record<string, { camps: number }> | undefined }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        const stats = data?.stats;
        for (const doctor of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: doctor._id?.toString(),

                // owning tenant (populated { name, code } when requested, else the raw id)
                tenant: doctor.tenant,

                // owning division (populated { name, code, therapy } when requested, else the raw id)
                division: doctor.division,

                // identity
                pharmaCode: doctor.pharmaCode,
                name: doctor.name,
                specialization: doctor.specialization,

                // contact
                mobile: doctor.mobile,
                email: doctor.email,

                // full postal address + geo point (embedded, same shape as camp's location)
                location: doctor.location || null,

                createdAt: doctor.createdAt,
                updatedAt: doctor.updatedAt,
            };
            if (ctx.hasAnyPermissions([DOCTOR_PERMISSIONS.MANAGE.code])) {
                item.status = doctor.status;
            }
            // opt-in camp-count stat (only present when the search was called with report=true)
            if (stats) {
                item.stats = stats[doctor._id?.toString()] || { camps: 0 };
            }
            result.items.push(item);
        }
        return result;
    },
    // nearest results carry a $geoNear `distance` (meters from the search point) — surface it
    toNearestResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => ({
        count: data?.count || 0,
        items: (data?.items || []).map((doctor) => ({
            ...DoctorMapper.toResponse(doctor, ctx),
            distanceMeters: typeof doctor.distance === 'number' ? Math.round(doctor.distance) : null,
        })),
    }),
};
