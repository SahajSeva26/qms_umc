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
};
