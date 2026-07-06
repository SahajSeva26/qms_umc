import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.config';

export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(swaggerSpec);