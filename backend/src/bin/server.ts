import process from "process";
import {app} from "./app";
import connectDB from "../shared/config/connectDB";
import logger from "../shared/utils/logger";
import ENV from "../shared/config/app.config";
import { runSeed } from "../shared/env";



async function main() {
    logger.info('Starting server...');

    try {
        // 1: DB must be connected BEFORE seeding — seed writes go to a live connection,
        //    not Mongoose's command buffer.
        await connectDB();

        // 2: seed system tenant/user/roles (idempotent)
        await runSeed();

        // 3: only now accept traffic
        app.listen(ENV.App.Port, () => {
            logger.info({ port: ENV.App.Port }, 'Server is running');
        });
    } catch (err) {
        logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
}

main();