import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './swagger.registry';

// ===========IMPORT ALL MODULES HERE============
// ==============================================
import '../../../modules/auth/auth.routes';
import '../../../modules/user/user.routes';
import '../../../modules/access-management/tenant/tenant.routes';
import '../../../modules/access-management/permission-group/permissionGroup.routes';
import '../../../modules/access-management/role-type/roleType.routes';
import '../../../modules/access-management/role/role.routes';
import '../../../modules/crm/division/division.routes';
import '../../../modules/crm/lead/lead.routes';
import '../../../modules/crm/contact/contact.routes';
import '../../../modules/crm/appointment/appointment.routes';
import '../../../modules/crm/project/project.routes';
import '../../../modules/qa-feedback/qaFeedback.routes';
import '../../../modules/doctor/doctor.routes';
import '../../../modules/operations/geoProfile/geoProfile.routes';
import '../../../modules/operations/camp/camp.routes';
import '../../../modules/operations/testMaster/testMaster.routes';
import '../../../modules/operations/patient/patient.routes';
import '../../../modules/operations/screening/screening.routes';
import '../../../modules/counter/counter.routes';
import '../../../modules/inventory/inventory-master/inventory-master.routes';
import '../../../modules/inventory/inventory-consumable/inventory-consumable.routes';
import '../../../modules/inventory/inventory-device/inventory-device.routes';
import '../../../modules/inventory/inventory-assignment/inventory-assignment.routes';
import '../../../modules/inventory/inventory-request/inventory-request.routes';
import '../../../modules/inventory/inventory-ledger/inventory-ledger.routes';
import '../../../modules/finance/invoice/invoice.routes';
import '../../../modules/finance/invoiceLineItem/invoiceLineItem.routes';
// =============================================
// =============================================

export const swaggerSpec = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
        title: 'QMS backend API',
        version: '1.0.0',
        description: 'API documentation for QMS backend',
    },
    // Relative URL: Swagger UI sends "Try it out" requests to whatever origin the docs are served
    // from, so it works on localhost, a LAN IP, or a deployed domain without ever going cross-origin.
    servers: [{ url: '/api/v1', description: 'Current host' }],
});
