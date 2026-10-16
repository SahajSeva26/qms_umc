type channelType = 'sms' | 'email' | 'whatsapp' | 'in-app';


type recepient = {
    // role: string;
    source: string;
    channels: channelType[]
};

export type TemplateConfig = {
    code: string;
    status: string;
    recepients: recepient[];
    template: string;
    // Optional subject, rendered as a Handlebars string with the event data (e.g. '{{data.camp.venue}}').
    subject?: string;
};
