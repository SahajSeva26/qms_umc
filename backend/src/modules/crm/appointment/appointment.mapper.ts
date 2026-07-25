// Appointment Mapper

import { RequestContext } from '../../../shared/utils/contextBuilder';

export const AppointmentMapper = {
    toResponse: (appointment: any, ctx: RequestContext) => {
        const result: any = {
            id: appointment._id?.toString(),
            code: appointment.code,
            tenant: appointment.tenant,
            division: appointment.division,
            type: appointment.type,
            salesPerson: appointment.salesPerson,
            contactPerson: appointment.contactPerson,
            internalMembers: (appointment.internalMembers || []).map((inv: any) => ({
                role: inv.role,
                status: inv.status,
                note: inv.note,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
            })),
            lead: appointment.lead,
            parent: appointment.parent,
            mode: appointment.mode,
            destinationLink: appointment.destinationLink,
            duration: {
                startTime: appointment.duration?.startTime,
                endTime: appointment.duration?.endTime,
            },
            agenda: {
                public: appointment.agenda?.public,
                private: appointment.agenda?.private,
            },
            status: appointment.status,
            mom: {
                details: appointment.mom?.details,
                submittedAt: appointment.mom?.submittedAt,
                submissionDeadline: appointment.mom?.submissionDeadline,
            },
            nextSteps: appointment.nextSteps,
            stageHistory: (appointment.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const appointment of data?.items || []) {
            result.items.push(AppointmentMapper.toResponse(appointment, ctx));
        }
        return result;
    },
};
