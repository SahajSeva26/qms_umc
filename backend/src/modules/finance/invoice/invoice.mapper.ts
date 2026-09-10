// Invoice Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { INVOICE_ISSUED_STATUSES, INVOICE_NOT_YET_ISSUED_STATUSES, INVOICE_STATUS } from './invoice.constants';

export const InvoiceMapper = {
    toResponse: (invoice: any, ctx: RequestContext) => {
        const result: any = {
            id: invoice._id?.toString(),
            code: invoice.code,

            // links
            tenant: invoice.tenant,
            project: invoice.project,

            // dates
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,

            // money
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            discount: invoice.discount,
            total: invoice.total,

            // accounting sync
            syncToTally: invoice.syncToTally,

            // lifecycle
            status: invoice.status,
            stageHistory: (invoice.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),

            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const invoice of data?.items || []) {
            result.items.push(InvoiceMapper.toResponse(invoice, ctx));
        }
        return result;
    },
    toReportResponse: (report: any) => {
        const grouped = new Map<string, { count: number; value: number }>(
            (report?.statusCounts || []).map((s: any) => [s._id, { count: s.count || 0, value: s.value || 0 }]),
        );

        // every status is emitted, zero-filled — all six are reachable through the lifecycle
        const byStatus = Object.values(INVOICE_STATUS).map((status) => ({
            status,
            count: grouped.get(status)?.count || 0,
            value: grouped.get(status)?.value || 0,
        }));

        const valueOf = (statuses: string[]) =>
            statuses.reduce((sum, status) => sum + (grouped.get(status)?.value || 0), 0);

        return {
            summary: {
                totalInvoices: byStatus.reduce((sum, bucket) => sum + bucket.count, 0),
                // `value` on a status bucket is invoice value in that status — never money collected.
                issuedValue: valueOf(INVOICE_ISSUED_STATUSES),
                notYetIssuedValue: valueOf(INVOICE_NOT_YET_ISSUED_STATUSES),
                cancelledValue: valueOf([INVOICE_STATUS.CANCELLED]),
            },
            byStatus,
        };
    },
};
