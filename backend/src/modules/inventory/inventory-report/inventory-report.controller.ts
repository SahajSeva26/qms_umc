import { StatusCodes } from 'http-status-codes';
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { InventoryReportQuerySchema } from './inventory-report.validators';
import { InventoryReportService } from './inventory-report.service';
import { InventoryReportMapper } from './inventory-report.mapper';

const report = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = InventoryReportQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await InventoryReportService.report(filters, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Inventory report generated successfully',
            InventoryReportMapper.toReportResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InventoryReportController = { report };
