// Doctor Controller
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';
import { CreateDoctorPayloadSchema, SearchDoctorQuerySchema, UpdateDoctorPayloadSchema } from './doctor.validators';
import { StatusCodes } from 'http-status-codes';
import { DoctorService } from './doctor.service';
import { DoctorMapper } from './doctor.mapper';
import { RequestHandler } from '../../shared/utils/requestHandler';
import { RequestContext } from '../../shared/utils/contextBuilder';

const get = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;
        const { id } = req?.params;
        if (!id) {
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Doctor ID is required', null);
        }

        const doctor = await DoctorService.get(id, ctx);

        if (!doctor) {
            return ResponseHandler.appResponse(res, StatusCodes.NOT_FOUND, false, 'Doctor not found', null);
        }

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Doctor fetched successfully',
            DoctorMapper.toResponse(doctor, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const search = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data: filters, success, error } = SearchDoctorQuerySchema.safeParse(req.query);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                errors: validationErrors,
            });
        }

        const pagination = RequestHandler.getPagination(filters);

        const result = await DoctorService.search(filters, ctx, { pagination });

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Doctors fetched successfully',
            DoctorMapper.toSearchResponse(result, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context;

        const { data, success, error } = CreateDoctorPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const doctor = await DoctorService.create(data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.CREATED,
            true,
            'Doctor created successfully',
            DoctorMapper.toResponse(doctor, ctx),
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
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Doctor ID is required', null);
        }

        const { data, success, error } = UpdateDoctorPayloadSchema.safeParse(req.body);
        if (!success) {
            const validationErrors = formatZodError(error);
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            });
        }

        const doctor = await DoctorService.update(id, data, ctx);

        return ResponseHandler.appResponse(
            res,
            StatusCodes.OK,
            true,
            'Doctor updated successfully',
            DoctorMapper.toResponse(doctor, ctx),
        );
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

export const DoctorController = {
    get,
    search,
    create,
    update,
};
