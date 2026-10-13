import { TemplateConfig } from '../../../../shared/types/template.types';

const config: TemplateConfig = {
    code: 'camp.create',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.email',
            channels: {
                email: 'fo/email.hbs',
            },
        },
        {
            source: 'data.mr.email',
            channels: {
                email: 'mr/email.hbs',
            },
        },
    ],
};

export default config;
