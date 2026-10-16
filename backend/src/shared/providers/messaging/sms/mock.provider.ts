import { StatusCodes } from 'http-status-codes';
import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';
import { throwAppError } from '../../../utils/error';
import { isValidPhone } from '../../../utils/strings';

export const SMS = 'sms';

// Mock sms provider — logs the message instead of sending it. Swap for a real provider
// (beside this file, e.g. sns.provider.ts) later behind the same IMessageProvider interface.
// `subject` is not used for sms.
export class SmsMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
        // Validate the input is valid for this channel before "sending".
        if (!isValidPhone(message.to)) {
            return throwAppError(`Invalid sms recipient: ${message.to}`, StatusCodes.BAD_REQUEST);
        }
        if (!message.body) {
            return throwAppError('Sms body is required', StatusCodes.BAD_REQUEST);
        }

        logger.info(
            {
                channel: SMS,
                to: message.to,
                from: message.from,
                body: message.body,
            },
            '[MOCK SMS] message "sent"',
        );
    }
}
