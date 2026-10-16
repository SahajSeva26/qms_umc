import { StatusCodes } from 'http-status-codes';
import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';
import { throwAppError } from '../../../utils/error';
import { isValidEmail } from '../../../utils/strings';

export const EMAIL = 'email';

// Mock email provider — logs instead of sending. Real SES provider drops in behind IMessageProvider.
export class EmailMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
        if (!isValidEmail(message.to)) {
            return throwAppError(`Invalid email recipient: ${message.to}`, StatusCodes.BAD_REQUEST);
        }
        if (!message.body) {
            return throwAppError('Email body is required', StatusCodes.BAD_REQUEST);
        }

        logger.info(
            {
                channel: EMAIL,
                to: message.to,
                from: message.from,
                subject: message.subject,
                body: message.body,
            },
            '[MOCK EMAIL] message "sent"',
        );
    }
}
