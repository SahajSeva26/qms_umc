// Outbound messaging contract — a provider only knows HOW to deliver a message on one channel
// (email / whatsapp / sms). What to send and to whom is decided by the caller (the notification
// worker), not here. Mock providers log instead of sending; real providers drop in behind the
// same interface later.

export interface IMessage {
    // Recipient address for the channel — an email address (email) or phone number (whatsapp/sms).
    to: string;
    // Message content.
    body: string;
    // Email only — ignored by whatsapp/sms.
    subject?: string;
    // Optional sender override; providers fall back to a configured default.
    from?: string;
}

export interface IMessageProvider {
    send(message: IMessage): Promise<void>;
}
