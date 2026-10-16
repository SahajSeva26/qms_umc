import path from 'path';
import { pathToFileURL } from 'url';
import { logger } from './logger';

// Dynamically imports a module and returns its default export, or null if the module
// can't be loaded / has no default export. Generic + reusable — the caller resolves the
// path (absolute recommended, e.g. via path.join(__dirname, ...)), so this isn't tied to
// any one folder. Returns null (not throws) so callers decide how to handle a miss.
export async function loadTemplate<T>(modulePath: string): Promise<T | null> {
    if (!modulePath) {
        return null;
    }

    // Under ESM (how tsx runs), dynamic import of an absolute path must be a file:// URL —
    // a bare 'd:\...' path is rejected. Bare specifiers (package names) are imported as-is.
    const specifier = path.isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath;

    try {
        const module = await import(specifier);
        const value = module.default as T | undefined;

        if (!value) {
            logger.warn({ modulePath: specifier }, 'Module has no default export');
            return null;
        }

        return value;
    } catch (error) {
        logger.warn({ err: error, modulePath: specifier }, 'Failed to load module');
        return null;
    }
}
