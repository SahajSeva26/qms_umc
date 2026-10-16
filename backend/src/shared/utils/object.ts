// Reads a nested value by dot-path, e.g.
//   getByPath({ data: { fo: { email: 'x' } } }, 'data.fo.email') -> 'x'
// Returns undefined if any segment along the path is missing.
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
