import { TemplateConfig } from '../../../../shared/types/template.types';

const config: TemplateConfig = {
    code: 'camp.create',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.email',
            channels: ['email']
        },
        {
            source: 'data.mr.email',
            channels: ['email']
        },
    ],
    template: '/camp/create'
};

export default config;
