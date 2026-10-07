// Invoice Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';

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
    toSearchResponse: (data: { count: number; items: any[]; lineItemCounts?: Record<string, number> }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        const lineItemCounts = data?.lineItemCounts || {};
        for (const invoice of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
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

                // per-invoice line-item (billed-camp) count — feeds the card's "N camps" stat
                lineItemCount: lineItemCounts[invoice._id?.toString()] || 0,

                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
            };
            result.items.push(item);
        }
        return result;
    },
};
