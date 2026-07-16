import { configDotenv } from 'dotenv';
configDotenv();

let ENV = {
    App: {
        // INIT_ADMIN_TOKEN: process.env.INIT_ADMIN_TOKEN || "",
        Port: process.env.PORT || process.env.APP_PORT || 3000,
        Host: process.env.APP_HOST || 'localhost',
        Environment: process.env.APP_ENV || 'development',

        // Allowed frontend origins for CORS — comma-separated list, e.g.
        // "https://app.example.com,https://admin.example.com"
        CorsOrigins: (process.env.APP_CORS_ORIGINS || 'http://localhost:5173')
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
        SystemTenantDescription: process.env.APP_SYSTEM_TENANT_DESCRIPTION || 'QMS internal tenant for system operations',
    },
    DB: {
        URI: process.env.DB_URI || 'http://localhost:27017/qms',
    },
    JWT: {
        AccessTokenSecret: process.env.JWT_ACCESS_SECRET || 'secret',
        AccessTokenExpirySec: Number(process.env.JWT_ACCESS_EXPIRY_SEC) || 900, // 15 min fallback

        RefreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        RefreshExpirySec: Number(process.env.JWT_REFRESH_EXPIRY_SEC) || 60 * 60 * 24 * 7, // 7 days fallback
    },
    
};

export default ENV;
