// Re-export the pino logger from its dedicated module (src/shared/logger).
// This file is a compatibility shim: both named (`import { logger }`) and
// default (`import logger`) imports resolve to the same pino instance, since
// call sites use a mix of both styles.
import { logger } from '../logger/index';

export { logger };
export default logger;
