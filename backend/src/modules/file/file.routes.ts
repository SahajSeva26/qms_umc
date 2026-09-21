// File Routes
import express from 'express';
import { FileController } from './file.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    AttachFilesPayloadSchema,
    BulkActivateFilesPayloadSchema,
    ChangeFileStatusPayloadSchema,
    CreateFilePayloadSchema,
    SearchFileQuerySchema,
    UpdateFilePayloadSchema,
} from './file.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';

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

// create file(s) — presigned-upload flow: send file METADATA, get back a draft doc + upload URL each
registry.registerPath({
    method: 'post',
    path: '/files',
    tags: ['FILE'],
    summary: 'Register file(s) from metadata (each starts in draft) and get a presigned upload URL per file',
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
        201: { description: 'File(s) created; response carries an uploadUrl per file' },
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

// bulk activate a batch of draft files (called after the client uploads via the presigned URLs)
registry.registerPath({
    method: 'post',
    path: '/files/activate',
    tags: ['FILE'],
    summary: 'Flip a batch of draft files to active (after the client has uploaded them to storage)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: BulkActivateFilesPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Files activated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'A file was not found' },
        409: { description: 'A file cannot be activated (invalid transition or cap exceeded)' },
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

FileRouter.post('/', FileController.create);
FileRouter.post('/activate', FileController.bulkActivate);
FileRouter.post('/attach', FileController.attach);
FileRouter.put('/:id', FileController.update);
FileRouter.patch('/:id/status', FileController.changeStatus);
