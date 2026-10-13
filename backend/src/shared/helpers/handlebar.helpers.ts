import Handlebars from 'handlebars';

// Register custom Handlebars helpers (template functions). Called once at module load
// from handlebar.ts, before any template is compiled/rendered. Add new helpers here.
export function registerHelpers(): void {
    // Value helper: {{upper data.fo.name}}
    Handlebars.registerHelper('upper', (value: unknown) =>
        value == null ? '' : String(value).toUpperCase(),
    );

    // Value helper: {{formatDate data.camp.date}}
    Handlebars.registerHelper('formatDate', (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString('en-IN') : '',
    );

    // Block helper: {{#ifEquals a b}}...{{else}}...{{/ifEquals}}
    Handlebars.registerHelper(
        'ifEquals',
        function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
            return a === b ? options.fn(this) : options.inverse(this);
        },
    );
}
