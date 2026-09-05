// Patient Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { PATIENT_PERMISSIONS } from './patient.constants';
import { PATIENT_GENDERS, PATIENT_STATUS } from './patient.constants';
import {
    IPatientReportCountBucket,
    IPatientReportCountOnly,
    IPatientReportResponse,
    IPatientReportServiceResult,
} from './patient.types';

// ========================================================================================
// REPORT HELPERS
// ========================================================================================

const countOf = (branch?: IPatientReportCountOnly[]): number => branch?.[0]?.count || 0;

const toCountMap = (buckets?: IPatientReportCountBucket[]): Map<string | null, number> =>
    new Map((buckets || []).map((b) => [b._id, b.count]));

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
        for (const patient of data?.items || []) {
            result.items.push(PatientMapper.toResponse(patient, ctx));
        }
        return result;
    },

    toReportResponse: (report: IPatientReportServiceResult): IPatientReportResponse => {
        const statusCounts = toCountMap(report?.statusCounts);
        const genderCounts = toCountMap(report?.genderCounts);

        return {
            meta: {
                generatedAt: report.generatedAt.toISOString(),
            },
            summary: {
                totalPatients: countOf(report?.total),
                activePatients: statusCounts.get(PATIENT_STATUS.ACTIVE) || 0,
                inactivePatients: statusCounts.get(PATIENT_STATUS.INACTIVE) || 0,
            },
            byGender: Object.values(PATIENT_GENDERS).map((gender) => ({
                gender,
                count: genderCounts.get(gender) || 0,
            })),
            byStatus: Object.values(PATIENT_STATUS).map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),
        };
    },
};
