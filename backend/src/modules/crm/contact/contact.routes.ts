import express from 'express';
import { ContactController } from './contact.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateContactPayloadSchema,
    SearchContactQuerySchema,
    UpdateContactPayloadSchema,
} from './contact.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { CONTACT_PERMISSIONS } from './contact.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const ContactRouter = express.Router();

ContactRouter.use(AuthMiddleware);

// get contact
registry.registerPath({
    method: 'get',
    path: '/contacts/{id}',
    tags: ['CONTACT'],
    summary: 'Get contact',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Contact fetched successfully' },
        404: { description: 'Contact not found' },
    },
});

// search contacts
registry.registerPath({
    method: 'get',
    path: '/contacts',
    tags: ['CONTACT'],
    summary: 'Search contacts',
    request: {
        query: SearchContactQuerySchema,
    },
    responses: {
        200: { description: 'Contacts fetched successfully' },
    },
});

// create contact
registry.registerPath({
    method: 'post',
    path: '/contacts',
    tags: ['CONTACT'],
    summary: 'Create contact',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateContactPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Contact created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'Contact with this email already exists for the tenant' },
    },
});

// update contact
registry.registerPath({
    method: 'put',
    path: '/contacts/{id}',
    tags: ['CONTACT'],
    summary: 'Update contact',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateContactPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Contact updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Contact not found' },
    },
});

// =======================================================================
// ========================= EXPORT CONTACT ROUTES =======================
// =======================================================================
// platform managers (contact:manage) and tenant admins/managers may write;
// tenant admins/managers manage their own tenant's contacts (scoped by ctx.where).
const GUARD = [CONTACT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code];
const READ_GUARD = [CONTACT_PERMISSIONS.SEARCH.code, ...GUARD];

ContactRouter.get('/:id', AuthorizeMiddleware(READ_GUARD), ContactController.get);
ContactRouter.put('/:id', AuthorizeMiddleware(GUARD), ContactController.update);

ContactRouter.get('/', AuthorizeMiddleware(READ_GUARD), ContactController.search);
ContactRouter.post('/', AuthorizeMiddleware(GUARD), ContactController.create);
