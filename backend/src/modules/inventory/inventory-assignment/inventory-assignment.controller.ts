// Inventory-assignment Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    SearchInventoryAssignmentQuerySchema,
    UpdateInventoryAssignmentPayloadSchema,
} from './inventory-assignment.validators';
import { StatusCodes } from 'http-status-codes';
import { InventoryAssignmentService } from './inventory-assignment.service';
import { InventoryAssignmentMapper } from './inventory-assignment.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Assignment ID is required', null);
        }

        const assignment = await InventoryAssignmentService.get(id, ctx, { populate: true });

        if (!assignment) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Assignment not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Assignment fetched successfully',
            InventoryAssignmentMapper.toResponse(assignment),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchInventoryAssignmentQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await InventoryAssignmentService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Assignments fetched successfully',
            InventoryAssignmentMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { assignee } = req?.params;
        if (!assignee) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Assignee ID is required', null);
        }

        const { data, success, error } = UpdateInventoryAssignmentPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const assignment = await InventoryAssignmentService.update(assignee, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Assignment updated successfully',
            InventoryAssignmentMapper.toResponse(assignment),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InventoryAssignmentController = {
    get,
    search,
    update,
};
