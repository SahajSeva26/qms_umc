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
        URI: process.env.DB_URI || '',
    },
    JWT: {
        Secret: process.env.JWT_SECRET || 'secret',
        ExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
};

export default ENV;
