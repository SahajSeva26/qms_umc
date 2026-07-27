import { RequestContext } from '../../../shared/utils/contextBuilder';

export const ContactMapper = {
    toResponse: (contact: any, ctx: RequestContext) => {
        const result: any = {
            id: contact._id?.toString(),
            tenant: contact.tenant,
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
            result.items.push(ContactMapper.toResponse(contact, ctx));
        }
        return result;
    },
};
