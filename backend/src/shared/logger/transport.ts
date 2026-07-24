import pino from 'pino';

import ENV from '../config/app.config';

// Dev-only pretty transport. pino-pretty applies its DEFAULT colors to the level
// (silly/debug/info/warn/error/fatal). messageFormat only arranges the text —
// request id, then message, then response time; no manual coloring. req/res/
// responseTime are ignored so they don't also print as a trailing JSON blob.
// In production `transport` is undefined → pino writes structured JSON to stdout.
export const transport =
    ENV.App.Environment === 'development'
        ? pino.transport({
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss',
                  singleLine: true,
                  ignore: 'pid,hostname,req,res,responseTime',
                  messageFormat:
                      '{if req.id}(req:{req.id}) | {end}{msg}{if responseTime} | ({responseTime}ms){end}',
                  customLevels: 'silly:10,debug:20,info:30,warn:40,error:50,fatal:60',
                  useOnlyCustomLevels: 'true',
              },
          })
        : undefined;
