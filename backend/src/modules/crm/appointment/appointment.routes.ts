// Appointment Routes

import express from 'express';
import { AppointmentController } from './appointment.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateAppointmentPayloadSchema,
    MoveStagePayloadSchema,
    RespondPayloadSchema,
    SearchAppointmentQuerySchema,
    UpdateAppointmentPayloadSchema,
} from './appointment.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { APPOINTMENT_PERMISSIONS } from './appointment.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const AppointmentRouter = express.Router();

AppointmentRouter.use(AuthMiddleware);

// get appointment
registry.registerPath({
    method: 'get',
    path: '/appointments/{id}',
    tags: ['APPOINTMENT'],
    summary: 'Get appointment',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Appointment fetched successfully' },
        404: { description: 'Appointment not found' },
    },
});

// search appointments
registry.registerPath({
    method: 'get',
    path: '/appointments',
    tags: ['APPOINTMENT'],
    summary: 'Search appointments',
    request: {
        query: SearchAppointmentQuerySchema,
    },
    responses: {
        200: { description: 'Appointments fetched successfully' },
    },
});

// create appointment
registry.registerPath({
    method: 'post',
    path: '/appointments',
    tags: ['APPOINTMENT'],
    summary: 'Create appointment',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateAppointmentPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Appointment created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Division not found' },
    },
});

// update appointment
registry.registerPath({
    method: 'put',
    path: '/appointments/{id}',
    tags: ['APPOINTMENT'],
    summary: 'Update appointment',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateAppointmentPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Appointment updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Appointment not found' },
    },
});

// move appointment stage
registry.registerPath({
    method: 'patch',
    path: '/appointments/{id}/stage',
    tags: ['APPOINTMENT'],
    summary: 'Move appointment to a new stage (records reason in stage history)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: MoveStagePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Appointment stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Appointment not found' },
    },
});

// respond to appointment invite (rsvp)
registry.registerPath({
    method: 'patch',
    path: '/appointments/{id}/rsvp',
    tags: ['APPOINTMENT'],
    summary: 'Respond to an appointment invite (accept/decline your own rsvp)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: RespondPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'RSVP recorded successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Not an invited member of this appointment' },
        404: { description: 'Appointment not found' },
    },
});

// =======================================================================
// ======================= EXPORT APPOINTMENT ROUTES =====================
// =======================================================================
const GUARD = [APPOINTMENT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code];
// reps (appointment:search) may read; the service scopes them to their own appointments
const READ_GUARD = [APPOINTMENT_PERMISSIONS.SEARCH.code, ...GUARD];

AppointmentRouter.get(
    '/:id',
    AuthorizeMiddleware([
        APPOINTMENT_PERMISSIONS.MANAGE.code,
        APPOINTMENT_PERMISSIONS.SEARCH.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    AppointmentController.get,
);
// the sales person edits their own appointment via appointment:update; they also hold appointment:search,
// so the service's own-scope pins the update to appointments they own/attend. manage/tenant:manage see all.
AppointmentRouter.put(
    '/:id',
    AuthorizeMiddleware([
        APPOINTMENT_PERMISSIONS.MANAGE.code,
        APPOINTMENT_PERMISSIONS.UPDATE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    AppointmentController.update,
);
AppointmentRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([APPOINTMENT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    AppointmentController.moveStage,
);

// an invited member responds for themselves — read-level access is enough to reach the appointment;
// the service enforces that the actor is actually on the invite list.
AppointmentRouter.patch(
    '/:id/rsvp',
    AuthorizeMiddleware([
        APPOINTMENT_PERMISSIONS.MANAGE.code,
        APPOINTMENT_PERMISSIONS.SEARCH.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    AppointmentController.respond,
);

AppointmentRouter.get('/', AuthorizeMiddleware(READ_GUARD), AppointmentController.search);
AppointmentRouter.post('/', AuthorizeMiddleware(GUARD), AppointmentController.create);
