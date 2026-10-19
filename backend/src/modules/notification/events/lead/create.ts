import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'lead.create',
    status: 'active',
    recepients: [
        {
            source: 'data.salesPerson.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
        },
    ],
    template: '/lead/create',
    subject: 'A new lead has been assigned to you',
};

export default config;
