import { z } from 'zod';
import {
    extendZodWithOpenApi,
    OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);
export const registry = new OpenAPIRegistry();
