// Patient Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { PATIENT_PERMISSIONS } from './patient.constants';

const mapCreatedBy = (createdBy: any) => {
    if (!createdBy) {
        return null;
    }
    // populated (has name/code) vs raw ObjectId
    if (createdBy._id) {
        return { id: createdBy._id.toString(), name: createdBy.name, code: createdBy.code };
    }
    return { id: createdBy.toString() };
};

export const PatientMapper = {
    toResponse: (patient: any, ctx: RequestContext) => {
        const result: any = {
            id: patient._id?.toString(),

            code: patient.code,
            firstName: patient.firstName,
            middleName: patient.middleName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            mobile: patient.mobile,
            email: patient.email,
            address: patient.address,

            createdBy: mapCreatedBy(patient.createdBy),
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
        };
        // status (incl. inactive/soft-deleted patients) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([PATIENT_PERMISSIONS.MANAGE.code])) {
            result.status = patient.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
        for (const patient of data?.items || []) {
            const item: any = {
                id: patient._id?.toString(),

                code: patient.code,
                firstName: patient.firstName,
                middleName: patient.middleName,
                lastName: patient.lastName,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                mobile: patient.mobile,
                email: patient.email,
                address: patient.address,

                createdBy: mapCreatedBy(patient.createdBy),
                createdAt: patient.createdAt,
                updatedAt: patient.updatedAt,
            };
            // status (incl. inactive/soft-deleted patients) is only exposed to a manage-level actor
            if (ctx.hasAnyPermissions([PATIENT_PERMISSIONS.MANAGE.code])) {
                item.status = patient.status;
            }
            result.items.push(item);
        }
        return result;
    },
};
