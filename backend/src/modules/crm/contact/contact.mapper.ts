import { RequestContext } from '../../../shared/utils/contextBuilder';

export const ContactMapper = {
    toResponse: (contact: any, ctx: RequestContext) => {
        const result: any = {
            id: contact._id?.toString(),
            tenant: contact.tenant,
            division: contact.division || null,
            name: contact.name,
            designation: contact.designation,
            email: contact.email,
            phone: contact.phone,
            location: contact.location,
            type: contact.type,
            user: contact.user || null,
            hasLogin: Boolean(contact.user),
            status: contact.status,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const contact of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const item: any = {
                id: contact._id?.toString(),
                tenant: contact.tenant,
                division: contact.division || null,
                name: contact.name,
                designation: contact.designation,
                email: contact.email,
                phone: contact.phone,
                location: contact.location,
                type: contact.type,
                user: contact.user || null,
                hasLogin: Boolean(contact.user),
                status: contact.status,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
            };
            result.items.push(item);
        }
        return result;
    },
};
