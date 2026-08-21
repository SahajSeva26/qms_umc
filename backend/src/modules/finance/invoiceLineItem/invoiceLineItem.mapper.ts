// InvoiceLineItem Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';

export const InvoiceLineItemMapper = {
    toResponse: (lineItem: any, ctx: RequestContext) => {
        const result: any = {
            id: lineItem._id?.toString(),
            invoice: lineItem.invoice,
            camp: lineItem.camp,
            amount: lineItem.amount,
            createdAt: lineItem.createdAt,
            updatedAt: lineItem.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const lineItem of data?.items || []) {
            result.items.push(InvoiceLineItemMapper.toResponse(lineItem, ctx));
        }
        return result;
    },
};
