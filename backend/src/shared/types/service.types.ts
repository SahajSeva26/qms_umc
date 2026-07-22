import { ClientSession } from 'mongoose';

export interface IService {
    get: () => any;
    create: () => any;
    update: () => any;
    delete: () => any;
}

export interface IServiceOptions {
    populate?: boolean;
    pagination?: any;

    // Explicit opt-in for callers that need the query constrained to the
    // caller's own tenant (see user.service.ts's scopeToTenant — needed on
    // models like User that have no tenant field of their own, so scoping
    // can't just be ctx.where()'d in like every other module does). Defaults
    // to false/unset so existing internal callers (e.g. the create-time
    // email-uniqueness check, which is intentionally global) are unaffected.
    scopeToTenant?: boolean;

    // //transactionexplain with me easy steps

    // isTransaction?: boolean;
    // session?: ClientSession;
}
