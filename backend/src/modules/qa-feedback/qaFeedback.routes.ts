import express from 'express';
import { QaFeedbackController } from './qaFeedback.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    CreateQaFeedbackPayloadSchema,
    SearchQaFeedbackQuerySchema,
    UpdateQaFeedbackPayloadSchema,
} from './qaFeedback.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { QA_FEEDBACK_PERMISSIONS } from './qaFeedback.constants';

export const QaFeedbackRouter = express.Router();

// jira webhook (documented here, mounted below BEFORE AuthMiddleware — it's an
// external server-to-server call from Jira, not a logged-in user)
registry.registerPath({
    method: 'put',
    path: '/qa-feedback/webhook/jira',
    tags: ['QA_FEEDBACK'],
    summary: 'Jira webhook receiver — sync an issue change back to its feedback row',
    responses: {
        200: { description: 'Webhook received' },
    },
});

// PUBLIC — no AuthMiddleware: a Jira webhook carries no user session. Mounted before the
// router-wide auth guard below. TODO: gate it with Jira signature/secret verification.

// get qa feedback
registry.registerPath({
    method: 'get',
    path: '/qa-feedback/{id}',
    tags: ['QA_FEEDBACK'],
    summary: 'Get a QA feedback report',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'QA feedback fetched successfully' },
        404: { description: 'QA feedback not found' },
    },
});

// search qa feedback
registry.registerPath({
    method: 'get',
    path: '/qa-feedback',
    tags: ['QA_FEEDBACK'],
    summary: 'Search QA feedback reports',
    request: {
        query: SearchQaFeedbackQuerySchema,
    },
    responses: {
        200: { description: 'QA feedback fetched successfully' },
    },
});

// create qa feedback
registry.registerPath({
    method: 'post',
    path: '/qa-feedback',
    tags: ['QA_FEEDBACK'],
    summary: 'Submit a QA feedback report',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateQaFeedbackPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'QA feedback submitted successfully' },
        400: { description: 'Validation error' },
    },
});

// update (resolve) qa feedback
registry.registerPath({
    method: 'put',
    path: '/qa-feedback/{id}',
    tags: ['QA_FEEDBACK'],
    summary: 'Update a QA feedback report (e.g. mark resolved)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateQaFeedbackPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'QA feedback updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'QA feedback not found' },
    },
});

// =======================================================================
// ========================= EXPORT QA FEEDBACK ROUTES ===================
// =======================================================================

QaFeedbackRouter.put('/webhook/jira', QaFeedbackController.jiraWebhook);
QaFeedbackRouter.use(AuthMiddleware);

// Deliberately no AuthorizeMiddleware here
QaFeedbackRouter.post('/', QaFeedbackController.create);
QaFeedbackRouter.get(
    '/:id',
    AuthorizeMiddleware([QA_FEEDBACK_PERMISSIONS.MANAGE.code]),
    QaFeedbackController.get,
);
QaFeedbackRouter.get(
    '/',
    AuthorizeMiddleware([QA_FEEDBACK_PERMISSIONS.MANAGE.code]),
    QaFeedbackController.search,
);
QaFeedbackRouter.put(
    '/:id',
    AuthorizeMiddleware([QA_FEEDBACK_PERMISSIONS.MANAGE.code]),
    QaFeedbackController.update,
);
