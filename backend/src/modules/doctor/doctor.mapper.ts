// Doctor Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';
import { DOCTOR_PERMISSIONS } from './doctor.constants';

export const DoctorMapper = {
    toResponse: (doctor: any, ctx: RequestContext) => {
        const result: any = {
            id: doctor._id?.toString(),

            // identity
            pharmaCode: doctor.pharmaCode,
            name: doctor.name,
            specialization: doctor.specialization,

            // contact
            mobile: doctor.mobile,
            email: doctor.email,

            // location
            city: doctor.city,
            state: doctor.state,
            pincode: doctor.pincode,
            googleMapLink: doctor.googleMapLink || '',


            createdAt: doctor.createdAt,
            updatedAt: doctor.updatedAt,
        };
        if (ctx.hasAnyPermissions([DOCTOR_PERMISSIONS.MANAGE.code])) {
            result.status = doctor.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const doctor of data?.items || []) {
            result.items.push(DoctorMapper.toResponse(doctor, ctx));
        }
        return result;
    },
};
