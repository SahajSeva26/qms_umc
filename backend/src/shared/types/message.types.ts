// Outbound messaging contract — a provider delivers a message on one channel (email/whatsapp/sms).

export interface IMessage {
    // Email address (email) or phone number (whatsapp/sms).
    to: string;
    body: string;
    // Subject/title — consistent across all channels.
    subject?: string;
    from?: string;
}

export interface IMessageProvider {
    send(message: IMessage): Promise<void>;
}
