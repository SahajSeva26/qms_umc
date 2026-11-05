import mongoose from 'mongoose';
import ENV from './app.config.js';
import logger from '../utils/logger.js';

// Auto-attach the active transaction's session to every query/save via
// AsyncLocalStorage, so services never thread a session by hand.
// See src/shared/helpers/transactionHelper.ts
mongoose.set('transactionAsyncLocalStorage', true);

const connectDB = async () => {
    // Reuse an existing (or in-flight) connection instead of opening a second one.
    // readyState: 1 = connected, 2 = connecting. Makes connectDB safe to call more
    // than once in a process — subsequent calls just await the same connection.
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        await mongoose.connection.asPromise();
        return;
    }

    try {
        logger.info('Connecting to db... ');
        await mongoose.connect(ENV.DB.URI);
        logger.info('Database connected');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB connection error');
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info('Database disconnected');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB disconnection error');
        throw error;
    }
};

export default connectDB;
