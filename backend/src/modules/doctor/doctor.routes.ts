// Doctor Routes
import express from 'express';
import { DoctorController } from './doctor.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    CreateDoctorPayloadSchema,
    SearchDoctorQuerySchema,
    UpdateDoctorPayloadSchema,
} from './doctor.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { DOCTOR_PERMISSIONS } from './doctor.constants';

export const DoctorRouter = express.Router();

DoctorRouter.use(AuthMiddleware);

// get doctor
registry.registerPath({
    method: 'get',
    path: '/doctors/{id}',
    tags: ['DOCTOR'],
    summary: 'Get doctor (by id or pharmaCode)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Doctor fetched successfully' },
        404: { description: 'Doctor not found' },
    },
});

// search doctors
registry.registerPath({
    method: 'get',
    path: '/doctors',
    tags: ['DOCTOR'],
    summary: 'Search doctors',
    request: {
        query: SearchDoctorQuerySchema,
    },
    responses: {
        200: { description: 'Doctors fetched successfully' },
    },
});

// create doctor
registry.registerPath({
    method: 'post',
    path: '/doctors',
    tags: ['DOCTOR'],
    summary: 'Create doctor (global system record)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateDoctorPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Doctor created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'A doctor with this pharma code already exists' },
    },
});

// update doctor
registry.registerPath({
    method: 'put',
    path: '/doctors/{id}',
    tags: ['DOCTOR'],
    summary: 'Update doctor (pharmaCode is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateDoctorPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Doctor updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Doctor not found' },
    },
});

// =======================================================================
// ======================== EXPORT DOCTOR ROUTES =========================
// =======================================================================
// reads are open to any authenticated user — doctor is a global reference registry.
// only writes (create/update) are permission-guarded.
DoctorRouter.get('/:id', DoctorController.get);
DoctorRouter.get('/', DoctorController.search);

DoctorRouter.post(
    '/',
    AuthorizeMiddleware([DOCTOR_PERMISSIONS.MANAGE.code]),
    DoctorController.create,
);
DoctorRouter.put(
    '/:id',
    AuthorizeMiddleware([DOCTOR_PERMISSIONS.MANAGE.code]),
    DoctorController.update,
);
