// Test Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { TEST_PERMISSIONS } from './test.constants';

const mapResourceLine = (line: any) => ({
    item: line?.item?._id ? line.item._id.toString() : line?.item?.toString(),
    quantity: line?.quantity,
});

export const TestMapper = {
    toResponse: (test: any, ctx: RequestContext) => {
        const result: any = {
            id: test._id?.toString(),

            // identity
            code: test.code,
            name: test.name,
            description: test.description,

            config: test.config,
            resourceRequired: (test.resourceRequired || []).map(mapResourceLine),
            resourceConsumption: (test.resourceConsumption || []).map(mapResourceLine),

            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
        };
        // status (incl. inactive tests) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
            result.status = test.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const test of data?.items || []) {
            result.items.push(TestMapper.toResponse(test, ctx));
        }
        return result;
    },
};
