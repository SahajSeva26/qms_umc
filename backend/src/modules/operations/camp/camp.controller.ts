// Camp Controller
import { ResponseHandler } from '../../../shared/utils/responseHandler';
import { formatZodError } from '../../../shared/utils/error';
import {
    ApproveVoidCampPayloadSchema,
    BookCampPayloadSchema,
    BookingAvailabilityPayloadSchema,
    CampReportQuerySchema,
    CreateCampPayloadSchema,
    MoveStagePayloadSchema,
    SearchCampQuerySchema,
    UpdateCampPayloadSchema,
    VoidCampPayloadSchema,
} from './camp.validators';
import { StatusCodes } from 'http-status-codes';
import { CampService } from './camp.service';
import { CampMapper } from './camp.mapper';
import { RequestHandler } from '../../../shared/utils/requestHandler';
import { RequestContext } from '../../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Camp ID is required', null);
        }

        const camp = await CampService.get(id, ctx, { populate: true });

        if (!camp) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Camp not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Camp fetched successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchCampQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await CampService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Camps fetched successfully',
            CampMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// "my camps" — field-force (FO / dietitian / MR) see only the camps they're assigned to. Delegates
// to CampService.myCamps, which own-scopes these non-manage roles to their own slot (fo/dietitian/mr).
const myCamps = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchCampQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await CampService.myCamps(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'My camps fetched successfully',
            CampMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateCampPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Camp created successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const book = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = BookCampPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.book(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Camp booked successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// void camp — internal team records a camp done without a PO (no lifecycle / allocation / clash)
const voidCamp = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = VoidCampPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.voidCamp(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Void camp created successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

// approve a void camp — moves it requested → closed (camp:manage only)
const approveVoidCamp = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Camp ID is required', null);
        }

        const { data, success, error } = ApproveVoidCampPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.approveVoidCamp(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Void camp approved successfully',
            CampMapper.toResponse(camp, ctx),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Camp ID is required', null);
        }

        const { data, success, error } = UpdateCampPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Camp updated successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const moveStage = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Camp ID is required', null);
        }

        const { data, success, error } = MoveStagePayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const camp = await CampService.moveStage(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Camp stage updated successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const allocateWorker = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Camp ID is required', null);
        }

        const camp = await CampService.allocateWorker(id, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Field worker allocated successfully',
            CampMapper.toResponse(camp, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const report = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = CampReportQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await CampService.report(filters, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Camp report generated successfully',
            CampMapper.toReportResponse(result),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const bookingAvailability = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = BookingAvailabilityPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const result = await CampService.bookingAvailability(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Booking availability fetched successfully',
            result,
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const CampController = {
    get,
    search,
    myCamps,
    create,
    voidCamp,
    approveVoidCamp,
    book,
    update,
    moveStage,
    allocateWorker,
    report,
    bookingAvailability,
};
