import { TemplateConfig } from '../../../../shared/types/template.types';

const config: TemplateConfig = {
    code: 'camp.fo-assigned',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.email',
            channels: ['email']
        },
    ],
    template: '/camp/fo-assigned'
};

export default config;
