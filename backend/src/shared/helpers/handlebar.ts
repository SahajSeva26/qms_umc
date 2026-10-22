import Handlebars from 'handlebars';
import { registerHelpers } from './handlebar.helpers';

// Register custom helpers once, before any template is compiled/rendered.
registerHelpers();

export class HandlebarsHelper {
    // Cache compiled templates by source so the same template isn't recompiled on every render.
    private static readonly cache = new Map<string, HandlebarsTemplateDelegate>();

    // Compile (or reuse) a Handlebars template source and render it with the given data.
    static render(source: string, data: unknown): string {
        let template = this.cache.get(source);
        if (!template) {
            template = Handlebars.compile(source);
            this.cache.set(source, template);
        }
        return template(data);
    }
}
