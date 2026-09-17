// File Routes
import express from 'express';
import { FileController } from './file.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    AttachFilesPayloadSchema,
    ChangeFileStatusPayloadSchema,
    SearchFileQuerySchema,
    UpdateFilePayloadSchema,
} from './file.validators';
import { ENTITY_RELATION_ARRAY, ENTITY_TYPE } from './file.constants';
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
                            // entityId is optional (upload-first — attach later via PUT /files/{id}); type + relation are required
                            entityId: {
                                type: 'string',
                                description: 'Id of the record this file hangs off (optional — attach later via update)',
                                example: '665f0c3a1a2b3c4d5e6f7a8a',
                            },
                            entityType: {
                                type: 'string',
                                enum: Object.values(ENTITY_TYPE),
                                example: 'tenant',
                            },
                            entityRelation: {
                                type: 'string',
                                enum: ENTITY_RELATION_ARRAY,
                                example: 'logo',
                            },
                            // content and type are NOT accepted — both are derived from the uploaded file in the service.
                            tags: { type: 'array', items: { type: 'string' }, example: ['branding'] },
                        },
                        required: ['files', 'tenant', 'entityType', 'entityRelation'],
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

// attach + activate a batch of draft files to a now-existing record
registry.registerPath({
    method: 'post',
    path: '/files/attach',
    tags: ['FILE'],
    summary: 'Attach a batch of draft files to a record and activate them (validated as a whole against the cap)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: AttachFilesPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Files attached and activated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'A file was not found' },
        409: { description: 'A file is not an unattached draft, or the cap would be exceeded' },
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
FileRouter.post('/attach', FileController.attach);
FileRouter.put('/:id', FileController.update);
FileRouter.patch('/:id/status', FileController.changeStatus);
