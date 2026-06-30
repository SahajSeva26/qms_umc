// logger.js
import chalk from 'chalk';
import ENV from '../config/app.config.js';

let lastLogTime = Date.now();

const getTimestamp = () => {
    const now = new Date();
    return now.toISOString(); // readable + sortable
};

const getTimeDiff = () => {
    const now = Date.now();
    const diff = now - lastLogTime;
    lastLogTime = now;
    return `+${diff}ms`;
};

const formatMessage = (level: string, message: string, meta: any) => {
    const time = getTimestamp();
    const diff = getTimeDiff();

    let base = `[${time}] [${level.toUpperCase()}] (${diff}) ${message}`;

    if (meta) {
        if (typeof meta === 'object') {
            base += `\n${JSON.stringify(meta, null, 2)}`;
        } else {
            base += ` ${meta}`;
        }
    }

    return base;
};

const logger = {
    error: (msg: string, meta?: any) => {
        console.error(chalk.red(formatMessage('error', msg, meta)));
    },

    warn: (msg: string, meta?: any) => {
        console.warn(chalk.yellow(formatMessage('warn', msg, meta)));
    },

    info: (msg: string, meta?: any) => {
        console.log(chalk.blue(formatMessage('info', msg, meta)));
    },

    success: (msg: string, meta?: any) => {
        console.log(chalk.green(formatMessage('success', msg, meta)));
    },

    debug: (msg: string, meta?: any) => {
        if (ENV.App.Environment !== 'production') {
            console.log(chalk.gray(formatMessage('debug', msg, meta)));
        }
    },

    silly: (msg: string, meta?: any) => {
        if (ENV.App.Environment !== 'production') {
            console.log(chalk.magenta(formatMessage('silly', msg, meta)));
        }
    },
};

export default logger;
