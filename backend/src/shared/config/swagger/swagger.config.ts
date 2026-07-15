import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './swagger.registry';

// ===========IMPORT ALL MODULES HERE============
// ==============================================
import  "../../../modules/auth/auth.routes";
import "../../../modules/user/user.routes";
import "../../../modules/access-management/tenant/tenant.routes";
import "../../../modules/access-management/permission-group/permissionGroup.routes";
import "../../../modules/access-management/role-type/roleType.routes";
import "../../../modules/access-management/role/role.routes";
// =============================================
// =============================================

export const swaggerSpec = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
        title: 'QMS backend API',
        version: '1.0.0',
        description: 'API documentation for QMS backend',
    },
    servers: [{ url: 'http://localhost:3000/api/v1', description: 'Development server' }],
});
