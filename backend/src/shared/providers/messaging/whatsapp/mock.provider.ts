import { StatusCodes } from 'http-status-codes';
import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';
import { throwAppError } from '../../../utils/error';
import { isValidPhone } from '../../../utils/strings';

export const WHATSAPP = 'whatsapp';

// Mock whatsapp provider — logs the message instead of sending it. Swap for a real provider
// (beside this file, e.g. cloud-api.provider.ts) later behind the same IMessageProvider interface.
export class WhatsappMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
        // Validate the input is valid for this channel before "sending".
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
