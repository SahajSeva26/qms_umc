// Rating Routes
import express from 'express';
import { RatingController } from './rating.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreateRatingPayloadSchema, SearchRatingQuerySchema, UpdateRatingPayloadSchema } from './rating.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { RATING_PERMISSIONS } from './rating.constants';

export const RatingRouter = express.Router();

RatingRouter.use(AuthMiddleware);

// get rating
registry.registerPath({
    method: 'get',
    path: '/ratings/{id}',
    tags: ['RATING'],
    summary: 'Get rating',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Rating fetched successfully' },
        404: { description: 'Rating not found' },
    },
});

// search ratings
registry.registerPath({
    method: 'get',
    path: '/ratings',
    tags: ['RATING'],
    summary: 'Search ratings',
    request: { query: SearchRatingQuerySchema },
    responses: {
        200: { description: 'Ratings fetched successfully' },
    },
});

// create rating
registry.registerPath({
    method: 'post',
    path: '/ratings',
    tags: ['RATING'],
    summary: 'Create a camp rating (MR rates the camp worker; tenant/worker/ratedBy/overall derived)',
    request: {
        body: { content: { 'application/json': { schema: CreateRatingPayloadSchema } } },
    },
    responses: {
        201: { description: 'Rating created successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Only the camp MR can rate' },
        404: { description: 'Camp not found' },
        409: { description: 'Camp not rateable / already rated' },
    },
});

// update rating
registry.registerPath({
    method: 'put',
    path: '/ratings/{id}',
    tags: ['RATING'],
    summary: 'Update a rating (sub-scores only; overall re-derived)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: UpdateRatingPayloadSchema } } },
    },
    responses: {
        200: { description: 'Rating updated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Only the rater can edit' },
        404: { description: 'Rating not found' },
    },
});

// =======================================================================
// ======================== EXPORT RATING ROUTES =========================
// =======================================================================
// reads require the matching read permission (or manage); writes require the matching write permission
// (or manage).
RatingRouter.get('/:id', AuthorizeMiddleware([RATING_PERMISSIONS.GET.code, RATING_PERMISSIONS.MANAGE.code], 'OR'), RatingController.get);
RatingRouter.get('/', AuthorizeMiddleware([RATING_PERMISSIONS.SEARCH.code, RATING_PERMISSIONS.MANAGE.code], 'OR'), RatingController.search);
RatingRouter.post('/', AuthorizeMiddleware([RATING_PERMISSIONS.CREATE.code, RATING_PERMISSIONS.MANAGE.code], 'OR'), RatingController.create);
RatingRouter.put('/:id', AuthorizeMiddleware([RATING_PERMISSIONS.UPDATE.code, RATING_PERMISSIONS.MANAGE.code], 'OR'), RatingController.update);
