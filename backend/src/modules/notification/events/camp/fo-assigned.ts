import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'camp.fo-assigned',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL]
        },
    ],
    template: '/camp/fo-assigned',
    subject: 'You have been assigned to a camp'
};

export default config;
