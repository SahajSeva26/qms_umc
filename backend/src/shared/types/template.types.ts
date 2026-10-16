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
    // Optional subject (used by the email channel). Rendered as a Handlebars string with the
    // same event data as the body, so it can interpolate values, e.g. 'New camp at {{data.camp.venue}}'.
    subject?: string;
};
