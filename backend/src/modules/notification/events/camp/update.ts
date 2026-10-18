import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'camp.update',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL]
        },
        {
            source: 'data.mr.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL]
        },
    ],
    template: '/camp/update',
    subject: 'A camp has been updated'
};

export default config;
