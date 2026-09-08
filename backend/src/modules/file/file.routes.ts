// File Routes
import express from 'express';
import { FileController } from './file.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    ChangeFileStatusPayloadSchema,
    CreateFilePayloadSchema,
    SearchFileQuerySchema,
    UpdateFilePayloadSchema,
} from './file.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { FILE_PERMISSIONS } from './file.constants';

export const FileRouter = express.Router();

FileRouter.use(AuthMiddleware);

// get file
registry.registerPath({
    method: 'get',
    path: '/files/{id}',
    tags: ['FILE'],
    summary: 'Get file by id',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'File fetched successfully' },
        404: { description: 'File not found' },
    },
});

// search files
registry.registerPath({
    method: 'get',
    path: '/files',
    tags: ['FILE'],
    summary: 'Search files',
    request: {
        query: SearchFileQuerySchema,
    },
    responses: {
        200: { description: 'Files fetched successfully' },
    },
});

// create file
registry.registerPath({
    method: 'post',
    path: '/files',
    tags: ['FILE'],
    summary: 'Register a file (starts in draft)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateFilePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'File created successfully' },
        400: { description: 'Validation error' },
    },
});

// update file metadata
registry.registerPath({
    method: 'put',
    path: '/files/{id}',
    tags: ['FILE'],
    summary: 'Update file metadata (displayName / tags)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateFilePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'File updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'File not found' },
    },
});

// change file status (state machine)
registry.registerPath({
    method: 'patch',
    path: '/files/{id}/status',
    tags: ['FILE'],
    summary: 'Move a file to a new status (validated against the transition map)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ChangeFileStatusPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'File status updated successfully' },
        404: { description: 'File not found' },
        409: { description: 'Invalid status transition' },
    },
});

// =======================================================================
// ========================= EXPORT FILE ROUTES ==========================
// =======================================================================
// reads are tenant-scoped but open to any authenticated user; writes (create/update/status)
// are guarded by file:manage.
FileRouter.get('/:id', FileController.get);
FileRouter.get('/', FileController.search);

FileRouter.post('/', AuthorizeMiddleware([FILE_PERMISSIONS.MANAGE.code]), FileController.create);
FileRouter.put('/:id', AuthorizeMiddleware([FILE_PERMISSIONS.MANAGE.code]), FileController.update);
FileRouter.patch('/:id/status', AuthorizeMiddleware([FILE_PERMISSIONS.MANAGE.code]), FileController.changeStatus);
