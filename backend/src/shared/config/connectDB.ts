import mongoose from 'mongoose';
import ENV from './app.config.js';
import logger from '../utils/logger.js';

const connectDB = async () => {
    try {
        logger.info('Connecting to db... ');
        await mongoose.connect(ENV.DB.URI);
        console.log('database connected....');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
