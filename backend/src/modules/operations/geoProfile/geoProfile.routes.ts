// GeoProfile Routes
import express from 'express';
import { GeoProfileController } from './geoProfile.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateGeoProfilePayloadSchema,
    NearestGeoProfileQuerySchema,
    SearchGeoProfileQuerySchema,
    UpdateGeoProfilePayloadSchema,
} from './geoProfile.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { GEO_PROFILE_PERMISSIONS } from './geoProfile.constants';

export const GeoProfileRouter = express.Router();

GeoProfileRouter.use(AuthMiddleware);

// nearest field staff (allocation)
registry.registerPath({
    method: 'get',
    path: '/geo-profiles/nearest',
    tags: ['GEO_PROFILE'],
    summary: 'Find nearest field staff of a type whose coverage reaches a point',
    request: {
        query: NearestGeoProfileQuerySchema,
    },
    responses: {
        200: { description: 'Nearest field staff fetched successfully' },
    },
});

// get geo profile
registry.registerPath({
    method: 'get',
    path: '/geo-profiles/{id}',
    tags: ['GEO_PROFILE'],
    summary: 'Get geo profile by id',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Geo profile fetched successfully' },
        404: { description: 'Geo profile not found' },
    },
});

// search geo profiles
registry.registerPath({
    method: 'get',
    path: '/geo-profiles',
    tags: ['GEO_PROFILE'],
    summary: 'Search geo profiles',
    request: {
        query: SearchGeoProfileQuerySchema,
    },
    responses: {
        200: { description: 'Geo profiles fetched successfully' },
    },
});

// create geo profile
registry.registerPath({
    method: 'post',
    path: '/geo-profiles',
    tags: ['GEO_PROFILE'],
    summary: 'Create geo profile (tenant derived from the linked role)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateGeoProfilePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Geo profile created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Role not found' },
        409: { description: 'A geo profile already exists for this role' },
    },
});

// update geo profile
registry.registerPath({
    method: 'put',
    path: '/geo-profiles/{id}',
    tags: ['GEO_PROFILE'],
    summary: 'Update geo profile (role + tenant are immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateGeoProfilePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Geo profile updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Geo profile not found' },
    },
});

// =======================================================================
// ======================== EXPORT GEO PROFILE ROUTES ====================
// =======================================================================
// reads (incl. allocation) are open to any authenticated user; writes are manage-guarded.
// NOTE: /nearest is declared before /:id so the literal path is not swallowed by the param route.
GeoProfileRouter.get('/nearest', GeoProfileController.nearest);
GeoProfileRouter.get('/:id', GeoProfileController.get);
GeoProfileRouter.get('/', GeoProfileController.search);

GeoProfileRouter.post('/', AuthorizeMiddleware([GEO_PROFILE_PERMISSIONS.MANAGE.code]), GeoProfileController.create);
GeoProfileRouter.put('/:id', AuthorizeMiddleware([GEO_PROFILE_PERMISSIONS.MANAGE.code]), GeoProfileController.update);
