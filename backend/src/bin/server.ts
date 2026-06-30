import process from "process";
import {app} from "./app";
import connectDB from "../shared/config/connectDB";
import logger from "../shared/utils/logger";
import ENV from "../shared/config/app.config";



async function main() {
    logger.info('Starting server...');

    connectDB()
        .then((v) => {
            app.listen(ENV.App.Port, () => {
                logger.info('Server is running on port:', ENV.App.Port);
            });
        })
        .catch((err) => {
            logger.error('Failed to start server:', err);
            process.exit(1);
        });
}

main();