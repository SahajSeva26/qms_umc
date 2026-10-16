// Reads a nested value by dot-path: getByPath({ data: { fo: { email: 'x' } } }, 'data.fo.email').
// Returns undefined if any segment is missing.
export function getByPath(obj: unknown, path: string): unknown {
    if (!obj || !path) {
        return undefined;
    }

    return path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}
