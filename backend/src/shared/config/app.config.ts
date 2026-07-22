import { configDotenv } from 'dotenv';
configDotenv();

let ENV = {
    App: {
        // INIT_ADMIN_TOKEN: process.env.INIT_ADMIN_TOKEN || "",
        Port: process.env.PORT || process.env.APP_PORT || 3000,
        Host: process.env.APP_HOST || 'localhost',
        Environment: process.env.APP_ENV || 'development',

        // Allowed frontend origins for CORS — comma-separated list, e.g.
        // "https://app.example.com,https://admin.example.com".
        // APP_CORS_ORIGINS wins in every environment; the per-env string is only a fallback when it's unset/empty.
        CorsOrigins: (process.env.APP_CORS_ORIGINS ||
            (process.env.APP_ENV === 'development'
                ? 'http://localhost:5174,http://localhost:3000'
                : 'http://localhost:5173')
        )
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),

        // System User
        SystemUserEmail: process.env.APP_SYSTEM_USER_EMAIL || 'system@gmail.com',
        SystemUserPassword: process.env.APP_SYSTEM_USER_PASSWORD || 'Test@123',
        SystemUserPhone: process.env.APP_SYSTEM_USER_PHONE || '7456920792',

        // Admin User
        AdminUserEmail: process.env.APP_ADMIN_USER_EMAIL || 'admin@gmail.com',
        AdminUserPassword: process.env.APP_ADMIN_USER_PASSWORD || 'Test@123',
        AdminUserPhone: process.env.APP_ADMIN_USER_PHONE || '7456920792',

        // Tenant dada
        SystemTenantCode: process.env.APP_SYSTEM_TENANT_CODE || 'qms',
        SystemTenantName: process.env.APP_SYSTEM_TENANT_NAME || 'QMS',
        SystemTenantDescription:
            process.env.APP_SYSTEM_TENANT_DESCRIPTION || 'QMS internal tenant for system operations',
    },
    // Build / deploy metadata — Railway injects the RAILWAY_GIT_* vars automatically
    // on every deploy, so /health-check can report exactly which commit is live.
    // Falls back to a manual GIT_COMMIT_SHA or 'unknown' when run outside Railway.
    Deployment: {
        Version: process.env.npm_package_version || 'unknown',
        Commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown',
        CommitMessage: process.env.RAILWAY_GIT_COMMIT_MESSAGE || '',
        Branch: process.env.RAILWAY_GIT_BRANCH || '',
    },
    DB: {
        URI: process.env.DB_URI || 'mongodb://localhost:27017/qms',
    },
    JWT: {
        AccessTokenSecret: process.env.JWT_ACCESS_SECRET || 'secret',
        AccessTokenExpirySec: Number(process.env.JWT_ACCESS_EXPIRY_SEC) || 900, // 15 min fallback

        RefreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        RefreshExpirySec: Number(process.env.JWT_REFRESH_EXPIRY_SEC) || 60 * 60 * 24 * 7, // 7 days fallback
    },

    RateLimit: {
        // Global limiter — applied to the whole API
        WindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 min
        Max: Number(process.env.RATE_LIMIT_MAX) || 100, // requests per window per IP

        // Strict limiter — applied to auth endpoints (brute-force targets)
        AuthWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 min
        AuthMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, // requests per window per IP
    },
};

export default ENV;
