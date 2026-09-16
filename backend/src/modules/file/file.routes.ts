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
import { imageUploader } from '../../shared/middlewares/upload/imageUploader';

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
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            // the binary upload(s) — multer field name is `files` (max 10)
                            files: {
                                type: 'array',
                                items: { type: 'string', format: 'binary' },
                                description: 'File(s) to upload (max 10)',
                            },
                            tenant: {
                                type: 'string',
                                description: 'Owning tenant id (platform staff only; ignored for customers)',
                                example: '665f0c3a1a2b3c4d5e6f7a8a',
                            },
                            entity: {
                                type: 'string',
                                description: 'JSON string: { id, type, relation } — all required',
                                example: '{"id":"665f0c3a1a2b3c4d5e6f7a8a","type":"tenant","relation":"logo"}',
                            },
                            // content and type are NOT accepted — both are derived from the uploaded file in the service.
                            tags: { type: 'array', items: { type: 'string' }, example: ['branding'] },
                        },
                        required: ['files', 'entity'],
                    },
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
// All routes are tenant-scoped but open to ANY authenticated user — no permission guard.
// (file:manage still gates discarded-file *visibility* in the search service.)
FileRouter.get('/:id', FileController.get);
FileRouter.get('/', FileController.search);

FileRouter.post('/', imageUploader.array('files', 5), FileController.create);
FileRouter.put('/:id', FileController.update);
FileRouter.patch('/:id/status', FileController.changeStatus);
