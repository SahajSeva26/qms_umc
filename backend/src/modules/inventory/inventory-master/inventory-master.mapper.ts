// Inventory-master Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { INVENTORY_MASTER_PERMISSIONS, ITEM_STATUS, ITEM_TYPES } from './inventory-master.constants';

export const InventoryMasterMapper = {
    toResponse: (item: any, ctx: RequestContext) => {
        const result: any = {
            id: item._id?.toString(),

            // identity
            code: item.code,
            name: item.name,
            description: item.description,
            type: item.type,
            sku: item.sku,
            unit: item.unit,

            // stock thresholds (reorder policy)
            minStock: item.minStock,

            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
        // status (incl. inactive items) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([INVENTORY_MASTER_PERMISSIONS.MANAGE.code])) {
            result.status = item.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const item of data?.items || []) {
            result.items.push(InventoryMasterMapper.toResponse(item, ctx));
        }
        return result;
    },

    toReportResponse: (report: any) => {
        const byType = new Map<string, number>((report?.catalogByType || []).map((r: any) => [r._id, r.count]));
        const byStatus = new Map<string, number>((report?.catalogByStatus || []).map((r: any) => [r._id, r.count]));

        return {
            summary: {
                catalogItems: report?.totalMaster || 0,
            },
            catalog: {
                byType: Object.values(ITEM_TYPES).map((type) => ({ type, count: byType.get(type) || 0 })),
                byStatus: Object.values(ITEM_STATUS).map((status) => ({ status, count: byStatus.get(status) || 0 })),
            },
        };
    },
};
