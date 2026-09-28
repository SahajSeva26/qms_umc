// App-level shared types.

// The environments the app recognises — narrows Environment so a typo (e.g. 'prodction')
// fails to compile and can't silently disable production-only behaviour like rate limiting.
export type AppEnvironment = 'development' | 'production' | 'test';
