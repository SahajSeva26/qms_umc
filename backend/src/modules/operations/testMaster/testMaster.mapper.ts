// TestMaster Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { TEST_MASTER_PERMISSIONS } from './testMaster.constants';

// item is populated (InventoryMaster) on GET /:id → {id, code, name, type};
// unpopulated (search/create/update) → {id} only.
const mapConsumptionLine = (line: any) => ({
    item: line?.item?._id
        ? {
              id: line.item._id.toString(),
              code: line.item.code,
              name: line.item.name,
              type: line.item.type,
          }
        : { id: line?.item?.toString() },
    rate: line?.rate,
});

export const TestMasterMapper = {
    toResponse: (test: any, ctx: RequestContext) => {
        const result: any = {
            id: test._id?.toString(),

            // identity
            code: test.code,
            name: test.name,
            description: test.description,
            therapy: test.therapy,
            campType: test.campType,
            duration: test.duration,
            price: test.price,

            config: test.config,
            consumption: (test.consumption || []).map(mapConsumptionLine),

            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
        };
        // status (incl. inactive tests) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([TEST_MASTER_PERMISSIONS.MANAGE.code])) {
            result.status = test.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
        for (const test of data?.items || []) {
            const item: any = {
                id: test._id?.toString(),

                // identity
                code: test.code,
                name: test.name,
                description: test.description,
                therapy: test.therapy,
                campType: test.campType,
                duration: test.duration,
                price: test.price,

                config: test.config,
                consumption: (test.consumption || []).map(mapConsumptionLine),

                createdAt: test.createdAt,
                updatedAt: test.updatedAt,
            };
            // status (incl. inactive tests) is only exposed to a manage-level actor
            if (ctx.hasAnyPermissions([TEST_MASTER_PERMISSIONS.MANAGE.code])) {
                item.status = test.status;
            }
            result.items.push(item);
        }
        return result;
    },
};
