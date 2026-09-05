// Camp Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { BILLING_TYPES, CAMP_REPORT_EXCEPTIONS, CAMP_STATUSES, CAMP_TIME_SLOTS, CAMP_TYPES } from './camp.constants';
import { ICampReportCountBucket, ICampReportResponse, ICampReportServiceResult } from './camp.types';

// ========================================================================================
// REPORT HELPERS
// ========================================================================================

const countOf = (branch?: { count: number }[]): number => branch?.[0]?.count || 0;

const toCountMap = (buckets?: ICampReportCountBucket[]): Map<string | null, number> =>
    new Map((buckets || []).map((b) => [b._id, b.count]));

const round2 = (value: number | null | undefined): number | null =>
    value === null || value === undefined ? null : Math.round(value * 100) / 100;

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

const enumerateMonths = (from: Date, to: Date): string[] => {
    const periods: string[] = [];
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

    while (cursor <= last) {
        const month = `${cursor.getUTCMonth() + 1}`.padStart(2, '0');
        periods.push(`${cursor.getUTCFullYear()}-${month}`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return periods;
};

export const CampMapper = {
    toResponse: (camp: any, ctx: RequestContext) => {
        const result: any = {
            id: camp._id?.toString(),
            code: camp.code,

            // links (derived from project)
            tenant: camp.tenant,
            division: camp.division,
            project: camp.project,
            doctor: camp.doctor,

            // classification
            type: camp.type,
            billingType: camp.billingType,
            patientExpectation: camp.patientExpectation,

            // field-force assignment
            fo: camp.fo,
            mr: camp.mr,
            asm: camp.asm,
            rsm: camp.rsm,

            // slot & location
            date: camp.date,
            timeSlot: camp.timeSlot || null,
            location: camp.location || null,

            // devices & confirmation
            devices: camp.devices || [],
            notes: camp.notes,
            conscentPath: camp.conscentPath,

            // lifecycle
            status: camp.status,
            stageHistory: (camp.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),

            createdAt: camp.createdAt,
            updatedAt: camp.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const camp of data?.items || []) {
            result.items.push(CampMapper.toResponse(camp, ctx));
        }
        return result;
    },
    toReportResponse: (report: ICampReportServiceResult): ICampReportResponse => {
        const statusCounts = toCountMap(report?.statusCounts);
        const typeCounts = toCountMap(report?.typeCounts);
        const billingTypeCounts = toCountMap(report?.billingTypeCounts);
        const timeSlotCounts = toCountMap(report?.timeSlotCounts);

        // window-scoped outcome counts. cancelled and cancelled_charged stay SPLIT — they differ commercially (lost revenue vs. still billed) and merging them would erase that.
        const closedCamps = statusCounts.get(CAMP_STATUSES.CLOSED) || 0;
        const cancelledFree = statusCounts.get(CAMP_STATUSES.CANCELLED) || 0;
        const cancelledCharged = statusCounts.get(CAMP_STATUSES.CANCELLED_CHARGED) || 0;

        // Denominator = camps whose outcome is RESOLVED (closed + both cancellations).
        const resolvedCamps = closedCamps + cancelledFree + cancelledCharged;
        const cancellationRate = resolvedCamps > 0 ? round4((cancelledFree + cancelledCharged) / resolvedCamps) : 0;

        const trendCounts = new Map((report?.trend || []).map((t) => [t._id, t]));
        const turnaround = report?.turnaround?.[0];

        // count lookups for the fixed exception set, keyed to the constant's declaration order
        const exceptionCounts: Record<string, number> = {
            CAMP_UNALLOCATED_IMMINENT: countOf(report?.unallocatedImminent),
            CAMP_STALE_LIVE: countOf(report?.staleLive),
            CAMP_STALE_CONFIRMED: countOf(report?.staleConfirmed),
            CAMP_UNALLOCATED: countOf(report?.unallocated),
            CAMP_NO_PROJECT: countOf(report?.noProject),
            CAMP_NO_COORDINATES: countOf(report?.noCoordinates),
        };

        return {
            meta: {
                generatedAt: report.generatedAt.toISOString(),
                window: {
                    from: report.window.from.toISOString(),
                    to: report.window.to.toISOString(),
                    basis: report.window.basis,
                },
            },

            summary: {
                // window-scoped
                totalCamps: countOf(report?.total),
                closedCamps,
                cancelledFree,
                cancelledCharged,
                cancellationRate,

                // current-state — deliberately NOT window-scoped (a blocker must not disappear just because the caller narrowed the window)
                liveNow: countOf(report?.liveNow),
                scheduledToday: countOf(report?.scheduledToday),
                scheduledNext7Days: countOf(report?.scheduledNext7Days),
                scheduledNext30Days: countOf(report?.scheduledNext30Days),
                unallocatedCamps: countOf(report?.unallocated),
            },

            // every enum bucket is zero-filled from the Camp constants — MongoDB only returns values  that actually occur, so absent ones must be materialised as 0 here
            byStatus: Object.values(CAMP_STATUSES).map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),
            byType: Object.values(CAMP_TYPES).map((type) => ({
                type,
                count: typeCounts.get(type) || 0,
            })),
            byBillingType: Object.values(BILLING_TYPES).map((billingType) => ({
                billingType,
                count: billingTypeCounts.get(billingType) || 0,
            })),
            byTimeSlot: Object.values(CAMP_TIME_SLOTS).map((timeSlot) => ({
                timeSlot,
                count: timeSlotCounts.get(timeSlot) || 0,
            })),

            // state is free text, not an enum — returned exactly as stored (no case folding), so inconsistent data stays visible rather than being silently merged
            byState: (report?.stateCounts || []).map((bucket) => ({
                state: bucket._id,
                count: bucket.count,
            })),

            // the `fo: null` bucket is preserved and surfaces as fo/name/code = null — those are the unallocated camps, deliberately not dropped
            byFieldOfficer: (report?.byFieldOfficer || []).map((bucket) => {
                const role = bucket.foDoc?.[0];
                return {
                    fo: bucket._id ? bucket._id.toString() : null,
                    name: role?.name ?? null,
                    code: role?.code ?? null,
                    total: bucket.total,
                    upcoming: bucket.upcoming,
                    closed: bucket.closed,
                    cancelled: bucket.cancelled,
                };
            }),

            // zero-filled across every month in the window so the chart has no gaps
            trend: enumerateMonths(report.window.from, report.window.to).map((period) => {
                const bucket = trendCounts.get(period);
                return {
                    period,
                    scheduled: bucket?.scheduled || 0,
                    closed: bucket?.closed || 0,
                    cancelled: bucket?.cancelled || 0,
                };
            }),

            turnaround: {
                // process turnaround from creation to confirmation — NOT physical camp duration.
                requestedToConfirmedHours: {
                    avg: round2(turnaround?.avg),
                    sampleSize: turnaround?.sampleSize || 0,
                },
            },

            // fixed set, most-actionable first (declaration order in CAMP_REPORT_EXCEPTIONS)
            exceptions: CAMP_REPORT_EXCEPTIONS.map((exception) => ({
                code: exception.code,
                severity: exception.severity,
                count: exceptionCounts[exception.code] || 0,
                label: exception.label,
            })),
        };
    },
};
