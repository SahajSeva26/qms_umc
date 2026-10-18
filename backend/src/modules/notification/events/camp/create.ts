import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'camp.create',
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
        {
            source: 'data.asm.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL]
        },
        {
            source: 'data.rsm.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL]
        },
    ],
    template: '/camp/create', 
    subject: 'A new camp has been created'
};

export default config;
