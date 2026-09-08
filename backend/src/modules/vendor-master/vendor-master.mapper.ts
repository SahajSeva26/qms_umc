// Vendor-master Mapper
import { RequestContext } from '../../shared/utils/contextBuilder';
import { VENDOR_MASTER_PERMISSIONS } from './vendor-master.constants';

export const VendorMasterMapper = {
    toResponse: (vendor: any, ctx: RequestContext) => {
        const result: any = {
            id: vendor._id?.toString(),

            // identity
            code: vendor.code,
            name: vendor.name,

            // points of contact
            contacts: vendor.contacts,

            // address (embedded, incl. optional GeoJSON coordinates)
            address: vendor.address,

            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt,
        };
        // status (incl. inactive vendors) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([VENDOR_MASTER_PERMISSIONS.MANAGE.code])) {
            result.status = vendor.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const vendor of data?.items || []) {
            result.items.push(VendorMasterMapper.toResponse(vendor, ctx));
        }
        return result;
    },
};
