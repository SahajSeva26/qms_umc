// Inventory-consumable Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { INVENTORY_CONSUMABLE_PERMISSIONS } from './inventory-consumable.constants';

// item may be a populated InventoryMaster doc or a raw ObjectId ref — surface a shallow shape either way.
const mapItem = (item: any) => {
    if (!item) return null;
    if (typeof item === 'object' && item._id) {
        return {
            id: item._id.toString(),
            code: item.code,
            name: item.name,
            sku: item.sku,
            unit: item.unit,
        };
    }
    return { id: item.toString() };
};

// vendor may be a populated VendorMaster doc or a raw ObjectId ref — surface a shallow shape either way.
const mapVendor = (vendor: any) => {
    if (!vendor) return null;
    if (typeof vendor === 'object' && vendor._id) {
        return {
            id: vendor._id.toString(),
            code: vendor.code,
            name: vendor.name,
        };
    }
    return { id: vendor.toString() };
};

export const InventoryConsumableMapper = {
    toResponse: (lot: any, ctx: RequestContext) => {
        const result: any = {
            id: lot._id?.toString(),

            // catalog item this lot is stock of
            item: mapItem(lot.item),

            // vendor this lot was purchased from
            vendor: mapVendor(lot.vendor),

            // lot identity + shelf life
            batch: lot.batch,
            manufacturingDate: lot.manufacturingDate,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,

            createdAt: lot.createdAt,
            updatedAt: lot.updatedAt,
        };
        // status (incl. expired lots) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code])) {
            result.status = lot.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const lot of data?.items || []) {
            result.items.push(InventoryConsumableMapper.toResponse(lot, ctx));
        }
        return result;
    },
};
