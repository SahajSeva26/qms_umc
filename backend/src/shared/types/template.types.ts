type channelType = 'sms' | 'email' | 'whatsapp' | 'in-app';


type recepient = {
    // role: string;
    source: string;
    channels: {
        email?: string;
    };
};

export type TemplateConfig = {
    code: string;
    status: string;
    recepients: recepient[];
};
