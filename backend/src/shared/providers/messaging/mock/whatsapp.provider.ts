import { IMessage, IMessageProvider } from '../../../types/message.types';
import { logger } from '../../../utils/logger';

export const WHATSAPP = 'whatsapp';

// Mock whatsapp provider — logs the message instead of sending it. Swap for a real provider
// (e.g. WhatsApp Cloud API) later behind the same IMessageProvider interface. `subject` is
// not used for whatsapp.
export class WhatsappMockProvider implements IMessageProvider {
    async send(message: IMessage): Promise<void> {
        logger.info(
            {
                channel: WHATSAPP,
                to: message.to,
                from: message.from,
                body: message.body,
            },
            '[MOCK WHATSAPP] message "sent"',
        );
    }
}
