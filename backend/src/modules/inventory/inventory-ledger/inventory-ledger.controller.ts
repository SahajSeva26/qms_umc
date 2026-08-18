// Inventory-ledger Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { SearchInventoryLedgerQuerySchema } from './inventory-ledger.validators';
import { StatusCodes } from 'http-status-codes';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLedgerMapper } from './inventory-ledger.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

// read-only: the ledger is written by the system (inventory-request service), never via HTTP.

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Ledger ID is required', null);
        }

        const row = await InventoryLedgerService.get(id, ctx, { populate: true });
        if (!row) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Ledger entry not found', null);
        }

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Ledger entry fetched successfully', InventoryLedgerMapper.toResponse(row));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchInventoryLedgerQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);
        const result = await InventoryLedgerService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Ledger entries fetched successfully', InventoryLedgerMapper.toSearchResponse(result));
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InventoryLedgerController = {
    get,
    search,
};
