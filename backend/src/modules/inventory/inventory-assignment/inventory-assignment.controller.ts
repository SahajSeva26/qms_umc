// Inventory-assignment Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    CreateInventoryAssignmentPayloadSchema,
    DirectAssignmentPayloadSchema,
    InventoryAssignmentReportQuerySchema,
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

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateInventoryAssignmentPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const assignment = await InventoryAssignmentService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Assignment created successfully',
            InventoryAssignmentMapper.toResponse(assignment),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// direct assignment — manager pushes stock straight to a field officer (the :fo route param)
const directAssign = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { fo } = req?.params;
        if (!fo) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Field officer id is required', null);
        }

        const { data, success, error } = DirectAssignmentPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await InventoryAssignmentService.directAssign(fo, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Inventory directly assigned successfully',
            InventoryAssignmentMapper.toSearchResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const update = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Assignment ID is required', null);
        }

        const { data, success, error } = UpdateInventoryAssignmentPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const assignment = await InventoryAssignmentService.update(id, data, ctx);

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

const remove = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Assignment ID is required', null);
        }

        await InventoryAssignmentService.remove(id, ctx);

        return ResponseHandler.appResponse(res, StatusCodes.OK, true, 'Assignment removed successfully', null);
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const report = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = InventoryAssignmentReportQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await InventoryAssignmentService.report(filters, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Inventory assignment report generated successfully',
            InventoryAssignmentMapper.toReportResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InventoryAssignmentController = {
    get,
    search,
    create,
    directAssign,
    update,
    remove,
    report,
};
