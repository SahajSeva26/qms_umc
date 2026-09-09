import express from 'express';
import { BrandController } from './brand.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreateBrandPayloadSchema, SearchBrandQuerySchema, UpdateBrandPayloadSchema } from './brand.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { BRAND_PERMISSIONS } from './brand.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const BrandRouter = express.Router();

BrandRouter.use(AuthMiddleware);

// get brand
registry.registerPath({
    method: 'get',
    path: '/brands/{id}',
    tags: ['BRAND'],
    summary: 'Get brand',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Brand fetched successfully' },
        404: { description: 'Brand not found' },
    },
});

// search brands
registry.registerPath({
    method: 'get',
    path: '/brands',
    tags: ['BRAND'],
    summary: 'Search brands',
    request: {
        query: SearchBrandQuerySchema,
    },
    responses: {
        200: { description: 'Brands fetched successfully' },
    },
});

// create brand
registry.registerPath({
    method: 'post',
    path: '/brands',
    tags: ['BRAND'],
    summary: 'Create brand',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateBrandPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Brand created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'Brand with this name already exists in the division' },
    },
});

// update brand
registry.registerPath({
    method: 'put',
    path: '/brands/{id}',
    tags: ['BRAND'],
    summary: 'Update brand',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateBrandPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Brand updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Brand not found' },
    },
});

// =======================================================================
// ========================== EXPORT BRAND ROUTES ========================
// =======================================================================
// platform managers (brand:manage) and tenant admins/managers may write;
// tenant admins/managers manage their own tenant's brands (scoped by ctx.where).
const GUARD = [BRAND_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code];
const READ_GUARD = [BRAND_PERMISSIONS.SEARCH.code, ...GUARD];

BrandRouter.get('/:id', AuthorizeMiddleware(READ_GUARD), BrandController.get);
BrandRouter.put('/:id', AuthorizeMiddleware(GUARD), BrandController.update);

BrandRouter.get('/', AuthorizeMiddleware(READ_GUARD), BrandController.search);
BrandRouter.post('/', AuthorizeMiddleware(GUARD), BrandController.create);
