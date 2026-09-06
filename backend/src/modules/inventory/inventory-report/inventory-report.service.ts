import { IInventoryReportQuery } from './inventory-report.validators';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { InventoryMasterService } from '../inventory-master/inventory-master.service';
import { InventoryDeviceService } from '../inventory-device/inventory-device.service';
import { InventoryConsumableService } from '../inventory-consumable/inventory-consumable.service';
import { InventoryRequestService } from '../inventory-request/inventory-request.service';
import { InventoryAssignmentService } from '../inventory-assignment/inventory-assignment.service';

// ========================================================================================
// THIN COMPOSITION LAYER (Phase 6)
// ========================================================================================
// inventory-report owns NO reporting/aggregation logic of its own anymore. Every metric was moved
// into its owning feature during Phases 1–5. This layer only orchestrates: it calls the five
// feature-owned report() services and hands their raw results to the mapper, which composes them
// (via each feature's own toReportResponse) into the original centralized response contract.
//
// There is deliberately no InventoryMasterModel.aggregate / $unionWith / $facet / $lookup / direct
// inventory-collection query here — those live in the feature services now.
//
// The five feature reports are independent, globally-scoped reads (each ignores filters/ctx exactly
// as the original centralized report did — no tenant/own-scope), so they run concurrently. Any one
// of them throwing propagates to the controller's existing error handling — no partial/fabricated
// report is returned.
const report = async (filters: IInventoryReportQuery, ctx: RequestContext) => {
    const [master, device, consumable, request, assignment] = await Promise.all([
        InventoryMasterService.report(filters, ctx),
        InventoryDeviceService.report(filters, ctx),
        InventoryConsumableService.report(filters, ctx),
        InventoryRequestService.report(filters, ctx),
        InventoryAssignmentService.report(filters, ctx),
    ]);

    return { master, device, consumable, request, assignment };
};

export const InventoryReportService = { report };
