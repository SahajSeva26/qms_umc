// Patient Routes
import express from 'express';
import { PatientController } from './patient.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreatePatientPayloadSchema, SearchPatientQuerySchema, UpdatePatientPayloadSchema } from './patient.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PATIENT_PERMISSIONS } from './patient.constants';

export const PatientRouter = express.Router();

PatientRouter.use(AuthMiddleware);

// get patient
registry.registerPath({
    method: 'get',
    path: '/patients/{id}',
    tags: ['PATIENT'],
    summary: 'Get patient (by id or code)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Patient fetched successfully' },
        404: { description: 'Patient not found' },
    },
});

// search patients
registry.registerPath({
    method: 'get',
    path: '/patients',
    tags: ['PATIENT'],
    summary: 'Search patients',
    request: {
        query: SearchPatientQuerySchema,
    },
    responses: {
        200: { description: 'Patients fetched successfully' },
    },
});

// create patient
registry.registerPath({
    method: 'post',
    path: '/patients',
    tags: ['PATIENT'],
    summary: 'Register patient (global registry; code auto-generated)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreatePatientPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Patient registered successfully' },
        400: { description: 'Validation error' },
        409: { description: 'A patient with this email already exists' },
    },
});

// update patient
registry.registerPath({
    method: 'put',
    path: '/patients/{id}',
    tags: ['PATIENT'],
    summary: 'Update patient (code is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdatePatientPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Patient updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Patient not found' },
    },
});

// =======================================================================
// ======================= EXPORT PATIENT ROUTES =========================
// =======================================================================
// reads require the matching read permission (or manage); writes require the matching
// write permission (or manage).
PatientRouter.get('/:id', AuthorizeMiddleware([PATIENT_PERMISSIONS.GET.code, PATIENT_PERMISSIONS.MANAGE.code], 'OR'), PatientController.get);
PatientRouter.get('/', AuthorizeMiddleware([PATIENT_PERMISSIONS.SEARCH.code, PATIENT_PERMISSIONS.MANAGE.code], 'OR'), PatientController.search);

PatientRouter.post('/', AuthorizeMiddleware([PATIENT_PERMISSIONS.CREATE.code, PATIENT_PERMISSIONS.MANAGE.code], 'OR'), PatientController.create);
PatientRouter.put('/:id', AuthorizeMiddleware([PATIENT_PERMISSIONS.UPDATE.code, PATIENT_PERMISSIONS.MANAGE.code], 'OR'), PatientController.update);
