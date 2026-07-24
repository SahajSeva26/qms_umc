import mongoose from 'mongoose';
import ENV from './app.config.js';
import logger from '../utils/logger.js';

// Auto-attach the active transaction's session to every query/save via
// AsyncLocalStorage, so services never thread a session by hand.
// See src/shared/helpers/transactionHelper.ts
mongoose.set('transactionAsyncLocalStorage', true);

const connectDB = async () => {
    try {
        logger.info('Connecting to db... ');
        await mongoose.connect(ENV.DB.URI);
        logger.info('Database connected');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB connection error');
        process.exit(1);
    }
};

export default connectDB;
