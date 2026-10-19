import { StatusCodes } from 'http-status-codes';
import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';
import { throwAppError } from '../../../utils/error';
import { isValidPhone } from '../../../utils/strings';

export const WHATSAPP = 'whatsapp';

// Mock whatsapp provider — logs instead of sending. Real provider drops in behind IMessageProvider.
export class WhatsappMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
        if (!isValidPhone(message.to)) {
            return throwAppError(`Invalid whatsapp recipient: ${message.to}`, StatusCodes.BAD_REQUEST);
        }
        if (!message.body) {
            return throwAppError('Whatsapp body is required', StatusCodes.BAD_REQUEST);
        }

        logger.info(
            {
                channel: WHATSAPP,
                to: message.to,
                from: message.from,
                subject: message.subject,
                body: message.body,
            },
            '[MOCK WHATSAPP] message "sent"',
        );
    }
}
