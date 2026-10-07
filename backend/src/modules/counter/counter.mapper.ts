// Counter Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';
import { COUNTER_PERMISSIONS } from './counter.constants';

export const CounterMapper = {
    toResponse: (counter: any, ctx: RequestContext) => {
        const result: any = {
            id: counter._id?.toString(),

            // identity
            entity: counter.entity,

            // formatting
            prefix: counter.prefix,
            suffix: counter.suffix || '',
            separator: counter.separator,
            padding: counter.padding,
            format: counter.format,

            // running sequence
            currentValue: counter.currentValue,

            description: counter.description || '',

            createdAt: counter.createdAt,
            updatedAt: counter.updatedAt,
        };
        if (ctx.hasAnyPermissions([COUNTER_PERMISSIONS.MANAGE.code])) {
            result.status = counter.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const counter of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: counter._id?.toString(),

                // identity
                entity: counter.entity,

                // formatting
                prefix: counter.prefix,
                suffix: counter.suffix || '',
                separator: counter.separator,
                padding: counter.padding,
                format: counter.format,

                // running sequence
                currentValue: counter.currentValue,

                description: counter.description || '',

                createdAt: counter.createdAt,
                updatedAt: counter.updatedAt,
            };
            if (ctx.hasAnyPermissions([COUNTER_PERMISSIONS.MANAGE.code])) {
                item.status = counter.status;
            }
            result.items.push(item);
        }
        return result;
    },
};
