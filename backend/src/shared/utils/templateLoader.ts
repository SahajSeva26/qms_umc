import path from 'path';
import { pathToFileURL } from 'url';
import { logger } from './logger';

// Dynamic-imports a module and returns its default export (null if it can't be loaded / has none).
// Caller resolves the path, so this isn't tied to any folder. Returns null (not throws) on a miss.
export async function loadTemplate<T>(modulePath: string): Promise<T | null> {
    if (!modulePath) {
        return null;
    }

    // Under ESM, dynamic import of an absolute path must be a file:// URL; bare specifiers are as-is.
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
