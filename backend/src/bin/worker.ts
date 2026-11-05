import process from "process";
import connectDB from "../shared/config/connectDB";
import logger from "../shared/utils/logger";
import { startNotificationWorker } from "../workers/notification.worker";

async function main() {
    logger.info('Starting workers...');

    try {
        // DB connected once; every worker shares this connection.
        await connectDB();

        // Each worker is an infinite poll loop → Promise.all never resolves, they run forever.
        await Promise.all([
            startNotificationWorker(),
            // add future workers here
        ]);
    } catch (err) {
        logger.error({ err }, 'Failed to start workers');
        process.exit(1);
    }
}

main();
