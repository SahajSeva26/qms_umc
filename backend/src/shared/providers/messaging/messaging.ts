import { IMessageProvider } from '../../types/message.types';
import { EMAIL, EmailMockProvider } from './email/mock.provider';
import { WHATSAPP, WhatsappMockProvider } from './whatsapp/mock.provider';
import { SMS, SmsMockProvider } from './sms/mock.provider';

// Resolves an outbound messaging provider by channel name (email / whatsapp / sms). Keys match
// the notification channel values, so the worker can do messagingManager.get(channel).send(msg).
// All providers are mocks for now — real ones drop in behind IMessageProvider without touching
// callers.
class MessagingManager {
    private readonly providers: Map<string, IMessageProvider> = new Map();

    constructor() {
        this.providers.set(EMAIL, new EmailMockProvider());
        this.providers.set(WHATSAPP, new WhatsappMockProvider());
        this.providers.set(SMS, new SmsMockProvider());
    }

    get(name: string): IMessageProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Messaging provider ${name} not found`);
        }
        return provider;
    }
}

export const messagingManager = new MessagingManager();
