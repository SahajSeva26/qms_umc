import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';

export const SMS = 'sms';

// Mock sms provider — logs the message instead of sending it. Swap for a real provider
// (e.g. SNS / a telecom gateway) later behind the same IMessageProvider interface. `subject`
// is not used for sms.
export class SmsMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
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
