import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'lead.update',
    status: 'active',
    recepients: [
        {
            source: 'data.salesPerson.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
        },
    ],
    template: '/lead/update',
    subject: 'A lead has been updated',
};

export default config;
