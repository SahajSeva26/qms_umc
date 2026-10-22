import { TemplateConfig } from '../../../../shared/types/template.types';
import { NOTIFICATION_CHANNELS } from '../../notification.constants';

const config: TemplateConfig = {
    code: 'project.update',
    status: 'active',
    recepients: [
        {
            source: 'data.projectCoordinator.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
        },
        {
            source: 'data.salesRep.user.email',
            channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
        },
    ],
    template: '/project/update',
    subject: 'A project has been updated',
};

export default config;
