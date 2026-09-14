// Appointment Mapper

import { RequestContext } from '../../../shared/utils/contextBuilder';
import { APPOINTMENT_REPORT_STATUSES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from './appointment.constants';

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
            stageHistory: (appointment.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                nextSteps: entry.nextSteps,
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
    toReportResponse: (report: any) => {
        const statusCounts = new Map<string, number>((report?.statusCounts || []).map((s: any) => [s._id, s.count]));
        const typeCounts = new Map<string, number>((report?.typeCounts || []).map((t: any) => [t._id, t.count]));

        // total is the sum of every matched document's status bucket — the aggregation never runs
        // a separate $count, and every appointment has a status (schema default), so this is exact.
        let total = 0;
        for (const count of statusCounts.values()) {
            total += count;
        }

        return {
            summary: {
                total,
                planned: statusCounts.get(APPOINTMENT_STATUSES.PLANNED) || 0,
                done: statusCounts.get(APPOINTMENT_STATUSES.DONE) || 0,
                cancelled: statusCounts.get(APPOINTMENT_STATUSES.CANCELLED) || 0,
            },
            // densified against the reachable statuses (see APPOINTMENT_REPORT_STATUSES), not the
            // raw enum — so a bucket that can never be non-zero is never emitted.
            byStatus: APPOINTMENT_REPORT_STATUSES.map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),
            byType: Object.values(APPOINTMENT_TYPES).map((type) => ({
                type,
                count: typeCounts.get(type) || 0,
            })),
        };
    },
};
