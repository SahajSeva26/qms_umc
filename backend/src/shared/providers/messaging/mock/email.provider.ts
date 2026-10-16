import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';

export const EMAIL = 'email';

// Mock email provider — logs the message instead of sending it. Swap for a real SES provider
// later behind the same IMessageProvider interface.
export class EmailMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
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
