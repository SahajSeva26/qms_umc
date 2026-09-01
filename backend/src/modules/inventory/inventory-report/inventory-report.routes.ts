import express from 'express';
import { InventoryReportController } from './inventory-report.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { InventoryReportQuerySchema } from './inventory-report.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { INVENTORY_MASTER_PERMISSIONS } from '../inventory-master/inventory-master.constants';
import { INVENTORY_DEVICE_PERMISSIONS } from '../inventory-device/inventory-device.constants';
import { INVENTORY_CONSUMABLE_PERMISSIONS } from '../inventory-consumable/inventory-consumable.constants';
import { INVENTORY_ASSIGNMENT_PERMISSIONS } from '../inventory-assignment/inventory-assignment.constants';
import { INVENTORY_REQUEST_PERMISSIONS } from '../inventory-request/inventory-request.constants';

const GUARD = [
    INVENTORY_MASTER_PERMISSIONS.MANAGE.code,
    INVENTORY_DEVICE_PERMISSIONS.MANAGE.code,
    INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code,
    INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code,
    INVENTORY_REQUEST_PERMISSIONS.MANAGE.code,
];

export const InventoryReportRouter = express.Router();

InventoryReportRouter.use(AuthMiddleware);

registry.registerPath({
    method: 'get',
    path: '/inventory/report',
    tags: ['INVENTORY'],
    summary: 'Get inventory statistics report',
    description:
        'Cross-domain inventory snapshot: catalog counts, device fleet status, consumable stock and expiry, request lifecycle, and per-FO holdings. Manager access only.',
    request: {
        query: InventoryReportQuerySchema,
    },
    responses: {
        200: { description: 'Inventory report generated successfully' },
        403: { description: 'Forbidden — inventory manager permission required' },
    },
});

InventoryReportRouter.get(
    '/report',
    reportRateLimiter,
    AuthorizeMiddleware(GUARD, 'OR'),
    InventoryReportController.report,
);
