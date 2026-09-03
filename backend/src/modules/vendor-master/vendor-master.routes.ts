// Vendor-master Routes
import express from 'express';
import { VendorMasterController } from './vendor-master.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    CreateVendorMasterPayloadSchema,
    SearchVendorMasterQuerySchema,
    UpdateVendorMasterPayloadSchema,
} from './vendor-master.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { VENDOR_MASTER_PERMISSIONS } from './vendor-master.constants';

export const VendorMasterRouter = express.Router();

VendorMasterRouter.use(AuthMiddleware);

// get vendor
registry.registerPath({
    method: 'get',
    path: '/vendor-masters/{id}',
    tags: ['VENDOR MASTER'],
    summary: 'Get vendor (by id or code)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Vendor fetched successfully' },
        404: { description: 'Vendor not found' },
    },
});

// search vendors
registry.registerPath({
    method: 'get',
    path: '/vendor-masters',
    tags: ['VENDOR MASTER'],
    summary: 'Search vendors',
    request: {
        query: SearchVendorMasterQuerySchema,
    },
    responses: {
        200: { description: 'Vendors fetched successfully' },
    },
});

// create vendor
registry.registerPath({
    method: 'post',
    path: '/vendor-masters',
    tags: ['VENDOR MASTER'],
    summary: 'Create vendor (global registry record)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateVendorMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Vendor created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'A vendor with this code already exists' },
    },
});

// update vendor
registry.registerPath({
    method: 'put',
    path: '/vendor-masters/{id}',
    tags: ['VENDOR MASTER'],
    summary: 'Update vendor (code is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateVendorMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Vendor updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Vendor not found' },
    },
});

// =======================================================================
// =================== EXPORT VENDOR MASTER ROUTES =======================
// =======================================================================
// The vendor registry is global but platform-only — every endpoint (reads included)
// is permission-guarded, and those permissions are only granted to platform role types.
VendorMasterRouter.get(
    '/:id',
    AuthorizeMiddleware([VENDOR_MASTER_PERMISSIONS.GET.code, VENDOR_MASTER_PERMISSIONS.MANAGE.code], 'OR'),
    VendorMasterController.get,
);
VendorMasterRouter.get(
    '/',
    AuthorizeMiddleware([VENDOR_MASTER_PERMISSIONS.SEARCH.code, VENDOR_MASTER_PERMISSIONS.MANAGE.code], 'OR'),
    VendorMasterController.search,
);

VendorMasterRouter.post(
    '/',
    AuthorizeMiddleware([VENDOR_MASTER_PERMISSIONS.CREATE.code, VENDOR_MASTER_PERMISSIONS.MANAGE.code], 'OR'),
    VendorMasterController.create,
);
VendorMasterRouter.put(
    '/:id',
    AuthorizeMiddleware([VENDOR_MASTER_PERMISSIONS.UPDATE.code, VENDOR_MASTER_PERMISSIONS.MANAGE.code], 'OR'),
    VendorMasterController.update,
);
