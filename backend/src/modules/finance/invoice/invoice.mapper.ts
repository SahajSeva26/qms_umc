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
};
