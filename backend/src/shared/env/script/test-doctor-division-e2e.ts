/**
 * E2E for DOCTOR division scoping (create-time branching + read-time own-scope).
 *
 * PREREQUISITE: boot the app once (seeds the system actor + role types), then seed the flow:
 *     npm run dev            # let it boot once, then stop it (or leave it)
 *     npm run seed:dummy
 * then:
 *     npx tsx src/shared/env/script/test-doctor-division-e2e.ts
 *
 * It drives the REAL DoctorService (god-mode + a customer MR ctx + a customer admin ctx) and asserts:
 *   PLATFORM create  → any division, but it must EXIST (404) and belong to the resolved tenant (400).
 *   CUSTOMER create  → incoming division must EQUAL the actor's own role.division (else 403);
 *                      an actor with no division (tenant admin) → 403.
 *   READ own-scope   → a customer actor only ever sees/reaches doctors in their OWN division.
 *
 * Self-contained: it creates a 2nd division in the seed tenant + a 2nd customer tenant (for the
 * cross-company check) and cleans up everything it created at the end (seed left intact).
 */

import '../../config/swagger/swagger.registry';

import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

import connectDB from '../../config/connectDB';
import logger from '../../utils/logger';
import ENV from '../../config/app.config';
import { PERMISSIONS } from '../permissions';

import { TenantModel } from '../../../modules/access-management/tenant/tenant.model';
import { RoleModel } from '../../../modules/access-management/role/role.model';
import { RoleTypeModel } from '../../../modules/access-management/role-type/roleType.model';
import { UserModel } from '../../../modules/user/user.model';
import { PermissionGroupModel } from '../../../modules/access-management/permission-group/permissionGroup.model';
import { DivisionModel } from '../../../modules/crm/division/division.model';
import { DoctorModel } from '../../../modules/crm/doctor/doctor.model';

import { TenantService } from '../../../modules/access-management/tenant/tenant.service';
import { DivisionService } from '../../../modules/crm/division/division.service';
import { DoctorService } from '../../../modules/crm/doctor/doctor.service';

import { TENANT_TYPE } from '../../../modules/access-management/tenant/tenant.constants';
import { DIVISION_THERAPY } from '../../../modules/crm/division/division.constants';
import { DOCTOR_SPECIALIZATION, DOCTOR_PERMISSIONS } from '../../../modules/crm/doctor/doctor.constants';

const SEED = { tenantCode: 'seed-acme', divisionCode: 'seed-div' };

// everything THIS test creates is tagged so cleanup is trivial
const T = {
    email: 'seed.doc.test', // email domain for every user this test mints
    tenant2Code: 'seed-doc-t2', // 2nd customer tenant (cross-company check)
    divBCode: 'seed-doc-db', // 2nd division inside the seed tenant
    divCCode: 'seed-doc-dc', // division inside the 2nd tenant
    password: 'Test@123',
};

const reg = (local: string, first: string, last: string) => ({
    firstName: first,
    lastName: last,
    email: `${local}@${T.email}`,
    password: T.password,
    phone: '9990000000',
});

// ---- tiny assertion harness (same shape as test-overlap-e2e) ----
let pass = 0;
let fail = 0;
const ok = (name: string) => {
    pass++;
    // eslint-disable-next-line no-console
    console.log(`  \x1b[32m✓ PASS\x1b[0m  ${name}`);
};
const bad = (name: string, detail: string) => {
    fail++;
    // eslint-disable-next-line no-console
    console.log(`  \x1b[31m✗ FAIL\x1b[0m  ${name} — ${detail}`);
};
const expectStatus = (code: number, label: string) => async (name: string, thunk: () => Promise<any>) => {
    try {
        await thunk();
        bad(name, `expected ${label}, but the call SUCCEEDED`);
    } catch (err: any) {
        if (err?.statusCode === code) {
            ok(`${name} → ${label}`);
        } else {
            bad(name, `expected ${label}, got ${err?.statusCode ?? 'no statusCode'} (${err?.message})`);
        }
    }
};
const expect400 = expectStatus(StatusCodes.BAD_REQUEST, '400');
const expect403 = expectStatus(StatusCodes.FORBIDDEN, '403');
const expect404 = expectStatus(StatusCodes.NOT_FOUND, '404');
const expectOk = async (name: string, thunk: () => Promise<any>) => {
    try {
        const result = await thunk();
        ok(`${name} → success`);
        return result;
    } catch (err: any) {
        bad(name, `expected success, got ${err?.statusCode ?? '?'} (${err?.message})`);
        return null;
    }
};

const SYSTEM_MANAGE = PERMISSIONS.SYSTEM.MANAGE.code;

// generic ctx builder — where() mirrors the real contextBuilder (platform → unscoped, customer → tenant-pinned)
const makeContext = (tenant: any, role: any, user: any, permissions: string[]): any => ({
    requestID: 'doctor-div-e2e',
    ipAddress: 'doctor-div-e2e',
    user,
    role,
    tenant,
    permissions,
    logger,
    setUser(u: any) { this.user = u; },
    setRole(r: any) { this.role = r; },
    setTenant(t: any) { this.tenant = t; },
    setPermissions(p: string[]) { this.permissions = p; },
    hasAnyPermissions(req: string[]) {
        if (this.permissions.includes(SYSTEM_MANAGE)) return true;
        return req.some((c) => this.permissions.includes(c));
    },
    hasAllPermissions(req: string[]) {
        if (this.permissions.includes(SYSTEM_MANAGE)) return true;
        return req.every((c) => this.permissions.includes(c));
    },
    requirePermissions() { return true; },
    where() {
        if (this.tenant?.type === TENANT_TYPE.PLATFORM) return {};
        return { tenant: this.tenant?._id || this.tenant?.id };
    },
});

// helper to normalize a possibly-populated division ref to its id string
const divIdOf = (d: any): string => (d?._id ? d._id.toString() : d?.toString());

const doc = (over: any) => ({
    pharmaCode: `SDOC-${Math.floor(Math.random() * 1e9)}`,
    name: 'Dr Test',
    specialization: DOCTOR_SPECIALIZATION.GP,
    mobile: '9998887770',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    ...over,
});

const cleanup = async (tenant2Id?: string) => {
    // doctors this test made (by email domain)
    await DoctorModel.deleteMany({ email: { $regex: `@${T.email}$` } });
    // division B (inside seed tenant) + its head role, matched by code prefix
    const seedTenant = await TenantModel.findOne({ code: SEED.tenantCode });
    if (seedTenant) {
        await DivisionModel.deleteMany({ tenant: seedTenant._id, code: T.divBCode });
        await RoleModel.deleteMany({ tenant: seedTenant._id, code: { $regex: `^${T.divBCode}` } });
    }
    // 2nd customer tenant subtree
    const t2 = tenant2Id ? { _id: tenant2Id } : await TenantModel.findOne({ code: T.tenant2Code });
    if (t2?._id) {
        const id = t2._id;
        await Promise.all([
            DoctorModel.deleteMany({ tenant: id }),
            DivisionModel.deleteMany({ tenant: id }),
            RoleModel.deleteMany({ tenant: id }),
            RoleTypeModel.deleteMany({ tenant: id }),
            PermissionGroupModel.deleteMany({ tenant: id }),
        ]);
        await TenantModel.deleteOne({ _id: id });
    }
    // any users this test minted
    await UserModel.deleteMany({ email: { $regex: `@${T.email}$` } });
};

const main = async () => {
    await connectDB();

    // god-mode ctx from the boot-seeded system actor
    const systemTenant = await TenantModel.findOne({ code: ENV.App.SystemTenantCode });
    const systemUser = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
    const systemRole = await RoleModel.findOne({ code: 'system' }).populate('type');
    if (!systemTenant || !systemUser || !systemRole) {
        throw new Error('System actor missing — boot the app once, then run npm run seed:dummy.');
    }
    const god = makeContext(
        systemTenant,
        systemRole,
        { _id: systemUser._id.toString(), email: systemUser.email },
        [SYSTEM_MANAGE],
    );

    // load the seeded customer flow
    const c1 = await TenantModel.findOne({ code: SEED.tenantCode });
    if (!c1) throw new Error('Seed customer tenant not found — run npm run seed:dummy first.');
    const divA = await DivisionModel.findOne({ tenant: c1._id, code: SEED.divisionCode });
    const mr = await RoleModel.findOne({ tenant: c1._id, name: 'Seed MR' });
    const adminRole = await RoleModel.findOne({ tenant: c1._id, code: 'admin' });
    if (!divA || !mr || !adminRole) throw new Error('Seeded division/MR/admin missing — re-run npm run seed:dummy.');

    // pre-clean anything a previous run of THIS test left behind
    await cleanup();

    // eslint-disable-next-line no-console
    console.log('\n============ setup: 2nd division (same tenant) + 2nd customer tenant ============');

    // division B inside the SAME seed tenant (god-mode)
    const divB = await DivisionService.create(
        {
            tenant: c1._id.toString(),
            code: T.divBCode,
            name: 'Doc Test Division B',
            therapy: [DIVISION_THERAPY.CARDIOLOGY],
            head: reg('divbhead', 'DivB', 'Head'),
        } as any,
        god,
    );

    // a 2nd customer tenant + a division inside it (for the cross-company check)
    const c2 = await TenantService.create(
        {
            code: T.tenant2Code,
            name: 'Doc Test Tenant 2',
            description: 'cross-company division check',
            owner: reg('t2admin', 'T2', 'Admin'),
        } as any,
        god,
    );
    const divC = await DivisionService.create(
        {
            tenant: c2._id.toString(),
            code: T.divCCode,
            name: 'Doc Test Division C',
            therapy: [DIVISION_THERAPY.CARDIOLOGY],
            head: reg('divchead', 'DivC', 'Head'),
        } as any,
        god,
    );
    ok('setup complete (divB in seed tenant, tenant2 + divC created)');

    const divAId = divA._id.toString();
    const divBId = divB._id.toString();
    const divCId = divC._id.toString();

    // customer contexts (call the service directly → route guards don't run; give doctor:manage anyway)
    const mrCtx = makeContext(c1, mr, { _id: 'mr', email: `mr@${T.email}` }, [DOCTOR_PERMISSIONS.MANAGE.code]);
    const adminCtx = makeContext(c1, adminRole, { _id: 'adm', email: `adm@${T.email}` }, [DOCTOR_PERMISSIONS.MANAGE.code]);

    // sanity: the seeded MR really is scoped to division A
    if (divIdOf(mr.division) === divAId) ok('precondition: seed MR.role.division === division A');
    else bad('precondition', `MR.division=${divIdOf(mr.division)} expected ${divAId}`);

    // eslint-disable-next-line no-console
    console.log('\n============ PLATFORM (god) create branch ============');

    const p1 = await expectOk('platform create doctor in tenant C1 / division A (valid)', () =>
        DoctorService.create(doc({ tenant: c1._id.toString(), division: divAId, email: `p1@${T.email}` }) as any, god),
    );

    await expect400('platform create in C1 with division C (belongs to tenant 2) → cross-company', () =>
        DoctorService.create(doc({ tenant: c1._id.toString(), division: divCId, email: `x@${T.email}` }) as any, god),
    );

    await expect404('platform create in C1 with a non-existent division → not found', () =>
        DoctorService.create(
            doc({ tenant: c1._id.toString(), division: '665f0c3a1a2b3c4d5e6f7a8a', email: `x@${T.email}` }) as any,
            god,
        ),
    );

    // eslint-disable-next-line no-console
    console.log('\n============ CUSTOMER create branch (division must match ctx.role.division) ============');

    const m1 = await expectOk('customer MR create with division A (== own division)', () =>
        DoctorService.create(doc({ division: divAId, email: `m1@${T.email}` }) as any, mrCtx),
    );

    await expect403('customer MR create with division B (same tenant, other division)', () =>
        DoctorService.create(doc({ division: divBId, email: `x@${T.email}` }) as any, mrCtx),
    );

    await expect403('customer tenant-admin (no division) create → not assigned to a division', () =>
        DoctorService.create(doc({ division: divAId, email: `x@${T.email}` }) as any, adminCtx),
    );

    // eslint-disable-next-line no-console
    console.log('\n============ READ own-scope (customer sees only own division) ============');

    // a doctor in division B (created via god) — the MR must NOT be able to see/reach it
    const b1 = await expectOk('setup: god create a doctor in division B', () =>
        DoctorService.create(doc({ tenant: c1._id.toString(), division: divBId, email: `b1@${T.email}` }) as any, god),
    );

    // MR search → only division-A doctors, never the division-B one
    const mrSearch = await DoctorService.search({} as any, mrCtx, { pagination: { limit: 100, skip: 0 } as any });
    const allInA = mrSearch.items.every((d: any) => divIdOf(d.division) === divAId);
    const hasB1 = mrSearch.items.some((d: any) => d._id.toString() === b1?._id?.toString());
    const hasM1 = mrSearch.items.some((d: any) => d._id.toString() === m1?._id?.toString());
    if (allInA && !hasB1 && hasM1) {
        ok(`MR search auto-scoped to division A (${mrSearch.items.length} items, all in A, B-doctor excluded, own visible)`);
    } else {
        bad('MR search own-scope', `allInA=${allInA} hasB1=${hasB1} hasM1=${hasM1} count=${mrSearch.items.length}`);
    }

    // MR get on the division-B doctor → null (out of scope); on its own division-A doctor → found
    const gotB1 = await DoctorService.get(b1!._id.toString(), mrCtx);
    if (gotB1 === null) ok('MR get on a division-B doctor → not reachable (null)');
    else bad('MR get cross-division', `expected null, got a doc (${gotB1?._id})`);

    const gotM1 = await DoctorService.get(m1!._id.toString(), mrCtx);
    if (gotM1 && gotM1._id.toString() === m1!._id.toString()) ok('MR get on its own division-A doctor → found');
    else bad('MR get own-division', `expected the doctor, got ${gotM1}`);

    // god (platform) can reach the division-B doctor fine (no own-scope)
    const godGotB1 = await DoctorService.get(b1!._id.toString(), god);
    if (godGotB1) ok('platform get on the division-B doctor → reachable (no own-scope)');
    else bad('platform get', 'expected the division-B doctor to be reachable by god');

    // avoid unused-var lint on p1
    if (p1) { /* created above */ }

    // eslint-disable-next-line no-console
    console.log('\n============ cleanup ============');
    await cleanup(c2._id.toString());
    ok('cleanup done (seed left intact)');

    // eslint-disable-next-line no-console
    console.log(`\n============ RESULT: ${pass} passed, ${fail} failed ============\n`);
    return fail;
};

main()
    .then(async (failCount) => {
        await mongoose.disconnect();
        process.exit(failCount ? 1 : 0);
    })
    .catch(async (err) => {
        logger.error({ err }, 'Doctor division e2e failed to run');
        await mongoose.disconnect();
        process.exit(1);
    });
