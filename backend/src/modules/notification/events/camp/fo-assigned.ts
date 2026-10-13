import { TemplateConfig } from '../../../../shared/types/template.types';

const config: TemplateConfig = {
    code: 'camp.fo-assigned',
    status: 'active',
    recepients: [
        {
            source: 'data.fo.email',
            channels: {
                email: 'fo/email.hbs',
            },
        },
    ],
};

export default config;
