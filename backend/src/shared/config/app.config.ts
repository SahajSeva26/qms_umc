import { configDotenv } from 'dotenv';
configDotenv();

let ENV = {
    App: {
        // INIT_ADMIN_TOKEN: process.env.INIT_ADMIN_TOKEN || "",
        Port: process.env.APP_PORT || 3000,
        Host: process.env.APP_HOST || 'localhost',
        Environment: process.env.APP_ENV || 'development',
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
};

export default ENV;
