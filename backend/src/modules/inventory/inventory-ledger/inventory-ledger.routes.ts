// Inventory-ledger Routes
import express from 'express';
import { InventoryLedgerController } from './inventory-ledger.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { SearchInventoryLedgerQuerySchema } from './inventory-ledger.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_LEDGER_PERMISSIONS } from './inventory-ledger.constants';

export const InventoryLedgerRouter = express.Router();

InventoryLedgerRouter.use(AuthMiddleware);

// get a ledger entry by id
registry.registerPath({
    method: 'get',
    path: '/inventory-ledgers/{id}',
    tags: ['INVENTORY LEDGER'],
    summary: 'Get a ledger entry (by id) — manager only',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Ledger entry fetched successfully' },
        404: { description: 'Ledger entry not found' },
    },
});

// search ledger entries
registry.registerPath({
    method: 'get',
    path: '/inventory-ledgers',
    tags: ['INVENTORY LEDGER'],
    summary: 'Search the movement ledger (by request, type, item, assignee, from/to) — manager only',
    request: {
        query: SearchInventoryLedgerQuerySchema,
    },
    responses: {
        200: { description: 'Ledger entries fetched successfully' },
    },
});

// =======================================================================
// ==================== EXPORT INVENTORY LEDGER ROUTES ===================
// =======================================================================
// The ledger is append-only + system-written: reads only, and manager-only (inventory-ledger:manage).
InventoryLedgerRouter.get('/:id', AuthorizeMiddleware([INVENTORY_LEDGER_PERMISSIONS.MANAGE.code]), InventoryLedgerController.get);
InventoryLedgerRouter.get('/', AuthorizeMiddleware([INVENTORY_LEDGER_PERMISSIONS.MANAGE.code]), InventoryLedgerController.search);
