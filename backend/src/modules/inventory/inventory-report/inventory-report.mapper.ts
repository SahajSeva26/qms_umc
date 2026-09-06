import { InventoryMasterMapper } from '../inventory-master/inventory-master.mapper';
import { InventoryDeviceMapper } from '../inventory-device/inventory-device.mapper';
import { InventoryConsumableMapper } from '../inventory-consumable/inventory-consumable.mapper';
import { InventoryRequestMapper } from '../inventory-request/inventory-request.mapper';
import { InventoryAssignmentMapper } from '../inventory-assignment/inventory-assignment.mapper';

// ========================================================================================
// THIN COMPOSITION MAPPER (Phase 6)
// ========================================================================================
// All enum-space zero-fill / shaping now lives in each feature's own toReportResponse. This mapper
// delegates every block to the owning feature mapper, then assembles the ORIGINAL centralized
// response contract by merging the five summary fragments and taking each feature's top-level block.
// It recomputes nothing — no counts, sums, status/type groups, pending/holding/expiry derivations.
const toReportResponse = (report: any) => {
    const master = InventoryMasterMapper.toReportResponse(report?.master);
    const device = InventoryDeviceMapper.toReportResponse(report?.device);
    const consumable = InventoryConsumableMapper.toReportResponse(report?.consumable);
    const request = InventoryRequestMapper.toReportResponse(report?.request);
    const assignment = InventoryAssignmentMapper.toReportResponse(report?.assignment);

    return {
        // cross-domain rollup — one field lifted from each feature's own summary (no recomputation)
        summary: {
            catalogItems: master.summary.catalogItems,
            totalDevices: device.summary.totalDevices,
            consumableLots: consumable.summary.consumableLots,
            warehouseConsumableQuantity: consumable.summary.warehouseConsumableQuantity,
            totalRequests: request.summary.totalRequests,
            pendingRequests: request.summary.pendingRequests,
            totalFieldOfficers: assignment.summary.totalFieldOfficers,
            fieldOfficersHoldingInventory: assignment.summary.fieldOfficersHoldingInventory,
        },

        // each nested block comes verbatim from its owning feature report
        catalog: master.catalog,
        devices: device.devices,
        consumables: consumable.consumables,
        requests: request.requests,
        fieldOfficers: assignment.fieldOfficers,
    };
};

export const InventoryReportMapper = { toReportResponse };
