// Inventory-device Routes
import express from 'express';
import { InventoryDeviceController } from './inventory-device.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInventoryDevicePayloadSchema,
    InventoryDeviceReportQuerySchema,
    SearchInventoryDeviceQuerySchema,
    UpdateInventoryDevicePayloadSchema,
} from './inventory-device.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_DEVICE_PERMISSIONS } from './inventory-device.constants';

export const InventoryDeviceRouter = express.Router();

InventoryDeviceRouter.use(AuthMiddleware);

// inventory device fleet report
registry.registerPath({
    method: 'get',
    path: '/inventory-devices/report',
    tags: ['INVENTORY DEVICE'],
    summary: 'Inventory device report — total device count and counts by lifecycle status',
    description:
        'Device fleet snapshot: summary.totalDevices (total device units) and devices.byStatus ' +
        '(counts per device status — available/in-transit/assigned/maintainance/lost/damaged — every ' +
        'status appears, defaulting to 0). Requires inventory-device:manage.',
    request: {
        query: InventoryDeviceReportQuerySchema,
    },
    responses: {
        200: { description: 'Inventory device report generated successfully' },
        403: { description: 'Forbidden — inventory-device:manage permission required' },
    },
});

// get device
registry.registerPath({
    method: 'get',
    path: '/inventory-devices/{id}',
    tags: ['INVENTORY DEVICE'],
    summary: 'Get device (by id or serial number)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Device fetched successfully' },
        404: { description: 'Device not found' },
    },
});

// search devices
registry.registerPath({
    method: 'get',
    path: '/inventory-devices',
    tags: ['INVENTORY DEVICE'],
    summary: 'Search devices',
    request: {
        query: SearchInventoryDeviceQuerySchema,
    },
    responses: {
        200: { description: 'Devices fetched successfully' },
    },
});

// create device
registry.registerPath({
    method: 'post',
    path: '/inventory-devices',
    tags: ['INVENTORY DEVICE'],
    summary: 'Create device unit (instance of a catalog item)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInventoryDevicePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Device created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'The referenced inventory item does not exist' },
        409: { description: 'A device with this serial number already exists' },
    },
});

// update device
registry.registerPath({
    method: 'put',
    path: '/inventory-devices/{id}',
    tags: ['INVENTORY DEVICE'],
    summary: 'Update device (item ref and serial number are immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInventoryDevicePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Device updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Device not found' },
    },
});

// =======================================================================
// =================== EXPORT INVENTORY DEVICE ROUTES ====================
// =======================================================================
// reads are open to any authenticated user; only writes (create/update) are permission-guarded.
// the report is manager-only; it MUST be registered before '/:id' so 'report' is not read as an id.
InventoryDeviceRouter.get(
    '/report',
    AuthorizeMiddleware([INVENTORY_DEVICE_PERMISSIONS.MANAGE.code]),
    InventoryDeviceController.report,
);
InventoryDeviceRouter.get('/:id', InventoryDeviceController.get);
InventoryDeviceRouter.get('/', InventoryDeviceController.search);

InventoryDeviceRouter.post(
    '/',
    AuthorizeMiddleware([INVENTORY_DEVICE_PERMISSIONS.MANAGE.code]),
    InventoryDeviceController.create,
);
InventoryDeviceRouter.put(
    '/:id',
    AuthorizeMiddleware([INVENTORY_DEVICE_PERMISSIONS.MANAGE.code]),
    InventoryDeviceController.update,
);
