import { ITEM_TYPES, ITEM_STATUS } from '../inventory-master/inventory-master.constants';
import { INVENTORY_DEVICE_STATUS } from '../inventory-device/inventory-device.constants';
import { INVENTORY_CONSUMABLE_STATUS } from '../inventory-consumable/inventory-consumable.constants';
import { INVENTORY_REQUEST_STATUS, INVENTORY_REQUEST_TYPE } from '../inventory-request/inventory-request.constants';

const toReportResponse = (report: any) => {
    const catalogByType = new Map<string, number>(
        (report?.catalogByType || []).map((r: any) => [r._id, r.count]),
    );
    const catalogByStatus = new Map<string, number>(
        (report?.catalogByStatus || []).map((r: any) => [r._id, r.count]),
    );
    const deviceByStatus = new Map<string, number>(
        (report?.deviceByStatus || []).map((r: any) => [r._id, r.count]),
    );
    const consumableByStatus = new Map<string, number>(
        (report?.consumableByStatus || []).map((r: any) => [r._id, r.count]),
    );
    const requestByStatus = new Map<string, number>(
        (report?.requestByStatus || []).map((r: any) => [r._id, r.count]),
    );
    const requestByType = new Map<string, number>(
        (report?.requestByType || []).map((r: any) => [r._id, r.count]),
    );

    return {
        summary: report?.derivedSummary || {
            catalogItems: 0,
            totalDevices: 0,
            consumableLots: 0,
            warehouseConsumableQuantity: 0,
            totalRequests: 0,
            pendingRequests: 0,
            totalFieldOfficers: 0,
            fieldOfficersHoldingInventory: 0,
        },

        catalog: {
            byType: Object.values(ITEM_TYPES).map((type) => ({
                type,
                count: catalogByType.get(type) || 0,
            })),
            byStatus: Object.values(ITEM_STATUS).map((status) => ({
                status,
                count: catalogByStatus.get(status) || 0,
            })),
        },

        devices: {
            byStatus: Object.values(INVENTORY_DEVICE_STATUS).map((status) => ({
                status,
                count: deviceByStatus.get(status) || 0,
            })),
        },

        consumables: {
            warehouseQuantity: report?.derivedSummary?.warehouseConsumableQuantity || 0,
            expiredByDate: report?.expiredByDate?.[0]?.count || 0,
            byStatus: Object.values(INVENTORY_CONSUMABLE_STATUS).map((status) => ({
                status,
                count: consumableByStatus.get(status) || 0,
            })),
        },

        requests: {
            byStatus: Object.values(INVENTORY_REQUEST_STATUS).map((status) => ({
                status,
                count: requestByStatus.get(status) || 0,
            })),
            byType: Object.values(INVENTORY_REQUEST_TYPE).map((type) => ({
                type,
                count: requestByType.get(type) || 0,
            })),
        },

        // fieldOfficers is scoped to currently ACTIVE field-officer roles (filtered in the service's
        // Role union branch) — an offboarded FO will not appear here.
        fieldOfficers: (report?.fieldOfficers || []).map((fo: any) => ({
            role: fo._id?.toString(),
            name: fo.name,
            code: fo.code,
            devicesHeld: fo.devicesHeld || 0,
            consumableUnitsHeld: fo.consumableUnitsHeld || 0,
            awaitingApproval: fo.awaitingApproval || 0,
            awaitingReceipt: fo.awaitingReceipt || 0,
        })),
    };
};

export const InventoryReportMapper = { toReportResponse };
