// InvoiceLineItem Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    CreateInvoiceLineItemPayloadSchema,
    SearchInvoiceLineItemQuerySchema,
    UpdateInvoiceLineItemPayloadSchema,
} from './invoiceLineItem.validators';
import { StatusCodes } from 'http-status-codes';
import { InvoiceLineItemService } from './invoiceLineItem.service';
import { InvoiceLineItemMapper } from './invoiceLineItem.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Line item ID is required', null);
        }

        const lineItem = await InvoiceLineItemService.get(id, ctx, { populate: true });

        if (!lineItem) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Invoice line item not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Invoice line item fetched successfully',
            InvoiceLineItemMapper.toResponse(lineItem, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchInvoiceLineItemQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await InvoiceLineItemService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Invoice line items fetched successfully',
            InvoiceLineItemMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateInvoiceLineItemPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const lineItem = await InvoiceLineItemService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Invoice line item created successfully',
            InvoiceLineItemMapper.toResponse(lineItem, ctx),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Line item ID is required', null);
        }

        const { data, success, error } = UpdateInvoiceLineItemPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const lineItem = await InvoiceLineItemService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Invoice line item updated successfully',
            InvoiceLineItemMapper.toResponse(lineItem, ctx),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Line item ID is required', null);
        }

        const lineItem = await InvoiceLineItemService.remove(id, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Invoice line item deleted successfully',
            InvoiceLineItemMapper.toResponse(lineItem, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const InvoiceLineItemController = {
    get,
    search,
    create,
    update,
    remove,
};
