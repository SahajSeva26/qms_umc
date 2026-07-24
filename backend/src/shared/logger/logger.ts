import pino from 'pino';

import { redact } from './redact';
import { serializers } from './serializers';
import { transport } from './transport';
import ENV from '../config/app.config';

export const logger = pino(
    {
        redact,

        serializers,

        timestamp: pino.stdTimeFunctions.isoTime,
        customLevels: {
            silly: 10,
            debug: 20,
            info: 30,
            warn: 40,
            error: 50,
            fatal: 60,
        },
        useOnlyCustomLevels: true,
        level: ENV.App.Environment === 'development' ? 'silly' : 'info',
    },
    transport,
);
