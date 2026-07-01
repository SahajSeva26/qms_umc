import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './swagger.registry';

// ===========IMPORT ALL MODULES HERE============
// ==============================================

// =============================================
// =============================================

export const swaggerSpec = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
        title: 'QMS backend API',
        version: '1.0.0',
        description: 'API documentation for QMS backend',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
});
