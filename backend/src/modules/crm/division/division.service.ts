import mongoose, { HydratedDocument } from 'mongoose';
import { IDivision, DivisionModel } from './division.model';
import { IBulkMrPayload, ICreateDivisionPayload, ISearchDivisionQuery, IUpdateDivisionPayload } from './division.validators';
import { DIVISION_PERMISSIONS, DIVISION_STATUS } from './division.constants';
import { formatZodError, throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';
import { TenantService } from '../../access-management/tenant/tenant.service';
import { LEAD_PERMISSIONS } from '../lead/lead.constants';
import { RoleService } from '../../access-management/role/role.service';
import { RoleTypeModel } from '../../access-management/role-type/roleType.model';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CsvHelper } from '../../../shared/helpers/csvHelper';
import { CreateRolePayloadSchema, ICreateRolePayload } from '../../access-management/role/role.validators';
import { RoleTypeService } from '../../access-management/role-type/roleType.service';

type DivisionDocument = HydratedDocument<IDivision> | null;
const populate: any[] = [
    {
        path: 'tenant',
        select: 'name code type',
    },
    {
        // the division head role — populate its user + role type so reads surface who the head is
        path: 'owner',
        populate: [
            { path: 'user', select: 'firstName lastName email phone gender status' },
            { path: 'type', select: 'name code' },
        ],
    },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IDivision>, ctx: RequestContext) => {
    if (model.name) {
        entity.name = model.name;
    }
    if (model.therapy) {
        entity.therapy = model.therapy;
    }
    if (model.brandFocus !== undefined) {
        entity.brandFocus = model.brandFocus;
    }
    if (model.mrCount !== undefined) {
        entity.mrCount = model.mrCount;
    }
    if (model.status) {
        entity.status = model.status;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<DivisionDocument> => {
    let query = null;

    if (isValidObjectID(id)) {
        query = DivisionModel.findById(id);
    } else {
        query = DivisionModel.findOne({ code: id });
    }

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchDivisionQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: add default scoping
    const where: mongoose.QueryFilter<IDivision> = { ...ctx.where() };
    where.status = DIVISION_STATUS.ACTIVE;

    //2: add search filters
    if (filters.tenant && ctx.hasAnyPermissions([LEAD_PERMISSIONS.MANAGE.code, DIVISION_PERMISSIONS.MANAGE.code])) {
        where.tenant = filters.tenant;
    }
    if (filters.owner) {
        where.owner = filters.owner;
    }
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.therapy) {
        where.therapy = filters.therapy;
    }
    if (filters.status && ctx.hasAnyPermissions([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code])) {
        where.status = filters.status;
    }

    //3: execute queries
    const countPromise = DivisionModel.countDocuments(where);
    const dataPromise = DivisionModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateDivisionPayload, ctx: RequestContext): Promise<HydratedDocument<IDivision>> => {
    let division: DivisionDocument = null;

    //1: resolve the tenant supplied in the payload (accepts code or ObjectId)
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2: check for duplicate code
    division = await DivisionService.get(model.code, ctx);
    if (division) {
        return throwAppError('Division with this code already exists', StatusCodes.CONFLICT);
    }

    //3: the head role needs the pharma-division-head role type, provisioned per CUSTOMER tenant.
    // resolve it up-front (scoped to THIS tenant, by _id so the role service can't mis-match it to
    // another tenant's copy) and fail fast if the tenant was onboarded before it was provisioned.
    const headRoleType = await RoleTypeModel.findOne({
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_DIVISION_HEAD,
        tenant: tenant._id,
    });
    if (!headRoleType) {
        return throwAppError('The pharma-division-head role type is not provisioned for this tenant', StatusCodes.CONFLICT);
    }

    //4: create the division AND its head role in one transaction — roll back both if either fails
    division = await withTransaction(async () => {
        //4.1: create division under the resolved tenant
        const entity = new DivisionModel({
            code: model.code, //immutable
            tenant: tenant._id,
        });
        let d = await set(model, entity, ctx);
        d = await d.save();

        //4.2: mint the division head — RoleService.create registers a new (inactive) user from
        // model.head and links it to a pharma-division-head role scoped to this division.
        const head = await RoleService.create(
            {
                code: `${d.code}-head`,
                name: `${d.name} Division Head`,
                description: `Head of ${d.name} division`,
                tenant: tenant._id.toString(),
                type: headRoleType.id,
                division: d._id.toString(),
                user: model.head,
                permissions: [],
            },
            ctx,
        );

        //4.3: point the division at its head role (mirrors Tenant.owner)
        d.owner = head._id;
        d = await d.save();

        return d;
    });

    return division;
};

const update = async (id: string, model: IUpdateDivisionPayload, ctx: RequestContext) => {
    //1: get division first
    let division: DivisionDocument = null;
    division = await DivisionService.get(id, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: update division
    division = await set(model, division, ctx);
    division = await division.save();

    //3: return division
    return division;
};

const bulkCreateMr = async (payload: IBulkMrPayload, file: Express.Multer.File, ctx: RequestContext) => {
    //check if tenant exists
    const tenant = await TenantService.get(payload.tenant, ctx);
    
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    const supervisor = await RoleService.get(payload.supervisor, ctx);
    if (!supervisor) {
        return throwAppError('Supervisor not found', StatusCodes.NOT_FOUND);
    }

    const mrRoleType = await RoleTypeService.search(
        {
            tenant: supervisor.tenant.toString(),
            code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR,
            limit: '1',
        },
        ctx,
    );

    // TODO: Implement bulk MR creation logic
    console.log('Bulk MR creation data:', payload);
    const rows = await CsvHelper.parse(file.buffer);

    const validRows: any[] = [];
    const inValidRows: any[] = [];

    rows.forEach((row: any, index: number) => {
        const rootPaylod: ICreateRolePayload = {
            code: `${ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR}.${row.firstName}`,
            name: `${ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR} role for ${row.firstName}`,
            description: `${ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR} role for ${row.firstName}, created by bulk import`,
            tenant: payload.tenant,
            type: row.type,
            division: row.division,
            user: row.user,
            permissions: row.permissions,
        };
        const { data, success, error } = CreateRolePayloadSchema.safeParse(row);

        if (!success) {
            const validationErrors = formatZodError(error);
            inValidRows.push({ row: index + 1, error: validationErrors });
        } else {
            validRows.push(data);
        }
    });
    console.log('Bulk MR creation rows:', validRows);
    return { total: rows.length, valid: validRows.length, invalid: inValidRows.length };
};

export const DivisionService = {
    get,
    search,
    create,
    update,
    bulkCreateMr,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
