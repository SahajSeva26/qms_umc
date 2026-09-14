/**
 * E2E for the FO slot-overlap 409s on CampService.create() and update().
 *
 * PREREQUISITE: run the dummy seeder first so the full flow + slot-blocking camps exist:
 *     npm run seed:dummy
 * then:
 *     npx tsx src/shared/env/script/test-overlap-e2e.ts
 *
 * The seeder blocks, on DAY_PARTIAL (today+2): fo1 @ 9-1 (live), fo2 @ 10-2, fo3 @ 11-3 (confirmed).
 * Daytime slots overlap each other; evening (6-10) is free. DAY_CANCELLED (today+4) has one CANCELLED
 * fo1 @ 9-1 camp that must NOT hold the slot. This script drives the real services (god-mode ctx) and
 * asserts create/update reject an overlapping FO with 409 and accept free slots.
 */

import '../../config/swagger/swagger.registry';

import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

import connectDB from '../../config/connectDB';
import logger from '../../utils/logger';
import ENV from '../../config/app.config';
import { startOfUTCDay } from '../../utils/dates';
import { PERMISSIONS } from '../permissions';

import { TenantModel } from '../../../modules/access-management/tenant/tenant.model';
import { RoleModel } from '../../../modules/access-management/role/role.model';
import { UserModel } from '../../../modules/user/user.model';
import { DivisionModel } from '../../../modules/crm/division/division.model';
import { DoctorModel } from '../../../modules/crm/doctor/doctor.model';
import { Project } from '../../../modules/crm/project/project.model';
import { CampModel } from '../../../modules/operations/camp/camp.model';

import { CampService } from '../../../modules/operations/camp/camp.service';

import { TENANT_TYPE } from '../../../modules/access-management/tenant/tenant.constants';
import { CAMP_STATUSES, CAMP_TIME_SLOTS } from '../../../modules/operations/camp/camp.constants';
import { PROJECT_STATUS } from '../../../modules/crm/project/project.constants';

const SEED = { tenantCode: 'seed-acme', divisionCode: 'seed-div' };
const S = CAMP_TIME_SLOTS;

const addUTCDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

const location = {
    addressLine1: '12 MG Road',
    locality: 'Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400058',
    coordinates: [72.8777, 19.076],
};

// ---- tiny assertion harness ----
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

// asserts the thunk throws an AppError with the given status code
const expect409 = async (name: string, thunk: () => Promise<any>) => {
    try {
        await thunk();
        bad(name, 'expected 409, but the call SUCCEEDED');
    } catch (err: any) {
        if (err?.statusCode === StatusCodes.CONFLICT) {
            ok(`${name} → 409`);
        } else {
            bad(name, `expected 409, got ${err?.statusCode ?? 'no statusCode'} (${err?.message})`);
        }
    }
};

const expect403 = async (name: string, thunk: () => Promise<any>) => {
    try {
        await thunk();
        bad(name, 'expected 403, but the call SUCCEEDED');
    } catch (err: any) {
        if (err?.statusCode === StatusCodes.FORBIDDEN) {
            ok(`${name} → 403`);
        } else {
            bad(name, `expected 403, got ${err?.statusCode ?? 'no statusCode'} (${err?.message})`);
        }
    }
};

const expect404 = async (name: string, thunk: () => Promise<any>) => {
    try {
        await thunk();
        bad(name, 'expected 404, but the call SUCCEEDED');
    } catch (err: any) {
        if (err?.statusCode === StatusCodes.NOT_FOUND) {
            ok(`${name} → 404`);
        } else {
            bad(name, `expected 404, got ${err?.statusCode ?? 'no statusCode'} (${err?.message})`);
        }
    }
};

// asserts the thunk succeeds; returns its result
const expectOk = async (name: string, thunk: () => Promise<any>) => {
    try {
        const result = await thunk();
        ok(`${name} → created/updated`);
        return result;
    } catch (err: any) {
        bad(name, `expected success, got ${err?.statusCode ?? '?'} (${err?.message})`);
        return null;
    }
};

const SYSTEM_MANAGE = PERMISSIONS.SYSTEM.MANAGE.code;

// generic ctx builder — permissions is whatever this actor holds; where() mirrors the real
// contextBuilder (platform → unscoped, customer → tenant-pinned).
const makeContext = (tenant: any, role: any, user: any, permissions: string[]): any => ({
    requestID: 'overlap-e2e',
    ipAddress: 'overlap-e2e',
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

const makeGodContext = (actor: { user: any; role: any; tenant: any }): any =>
    makeContext(actor.tenant, actor.role, actor.user, [SYSTEM_MANAGE]);

const main = async () => {
    await connectDB();

    // god-mode ctx from the boot-seeded system actor
    const systemTenant = await TenantModel.findOne({ code: ENV.App.SystemTenantCode });
    const systemUser = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
    const systemRole = await RoleModel.findOne({ code: 'system' }).populate('type');
    if (!systemTenant || !systemUser || !systemRole) {
        throw new Error('System actor missing — boot the app once, then run npm run seed:dummy.');
    }
    const ctx = makeGodContext({
        tenant: systemTenant,
        role: systemRole,
        user: {
            _id: systemUser._id.toString(),
            email: systemUser.email,
            firstName: systemUser.firstName,
            lastName: systemUser.lastName,
            role: systemRole._id.toString(),
            tenant: systemTenant._id.toString(),
        },
    });

    // load the seeded flow
    const customer = await TenantModel.findOne({ code: SEED.tenantCode });
    if (!customer) throw new Error('Seed customer tenant not found — run npm run seed:dummy first.');
    const division = await DivisionModel.findOne({ tenant: customer._id, code: SEED.divisionCode });
    const project = await Project.findOne({ tenant: customer._id, status: PROJECT_STATUS.LIVE });
    const doctor = await DoctorModel.findOne({ tenant: customer._id, pharmaCode: 'SEED-DOC-1' });
    const mr = await RoleModel.findOne({ tenant: customer._id, name: 'Seed MR' });
    const fo1 = await RoleModel.findOne({ code: 'seed-fo1' });
    const fo2 = await RoleModel.findOne({ code: 'seed-fo2' });
    if (!division || !project || !doctor || !mr || !fo1 || !fo2) {
        throw new Error('Seeded entities missing — re-run npm run seed:dummy.');
    }

    const today = startOfUTCDay(new Date());
    const DAY_PARTIAL = addUTCDays(today, 2); // fo1@9-1, fo2@10-2, fo3@11-3 booked; evening free
    const DAY_CANCELLED = addUTCDays(today, 4); // fo1@9-1 CANCELLED (must not block)
    const DAY_FREE = addUTCDays(today, 5); // no camps

    const base = (over: any) => ({
        tenant: customer._id.toString(),
        division: division._id.toString(),
        project: project._id.toString(),
        doctor: doctor._id.toString(),
        mr: mr._id.toString(),
        location,
        ...over,
    });

    // eslint-disable-next-line no-console
    console.log('\n============ CREATE overlap ============');

    // NEGATIVE: fo1 already on 9-1 (live) that day → booking 10-2 overlaps → 409
    await expect409('create: fo1 @ 10-2 on DAY_PARTIAL (overlaps its 9-1 camp)', () =>
        CampService.create(base({ fo: fo1._id.toString(), date: DAY_PARTIAL, timeSlot: S.SLOT_10_2 }) as any, ctx),
    );

    // NEGATIVE: fo1 on 11-3 also overlaps the daytime block → 409
    await expect409('create: fo1 @ 11-3 on DAY_PARTIAL (overlaps its 9-1 camp)', () =>
        CampService.create(base({ fo: fo1._id.toString(), date: DAY_PARTIAL, timeSlot: S.SLOT_11_3 }) as any, ctx),
    );

    // POSITIVE: evening (6-10) does not overlap daytime → allowed
    const eve = await expectOk('create: fo1 @ 6-10 on DAY_PARTIAL (evening, free)', () =>
        CampService.create(base({ fo: fo1._id.toString(), date: DAY_PARTIAL, timeSlot: S.SLOT_6_10 }) as any, ctx),
    );

    // POSITIVE: a CANCELLED camp must not hold the slot → fo1 @ 9-1 on DAY_CANCELLED allowed
    const canc = await expectOk('create: fo1 @ 9-1 on DAY_CANCELLED (prior camp cancelled → free)', () =>
        CampService.create(base({ fo: fo1._id.toString(), date: DAY_CANCELLED, timeSlot: S.SLOT_9_1 }) as any, ctx),
    );

    // eslint-disable-next-line no-console
    console.log('\n============ UPDATE overlap ============');

    // set up a fresh requested camp for fo2 on a free day/slot
    const draft = await expectOk('setup: create requested fo2 @ 9-1 on DAY_FREE', () =>
        CampService.create(base({ fo: fo2._id.toString(), date: DAY_FREE, timeSlot: S.SLOT_9_1 }) as any, ctx),
    );

    if (draft) {
        const draftId = draft._id.toString();

        // NEGATIVE: move it onto DAY_PARTIAL @ 9-1 — fo2 is confirmed @ 10-2 that day → overlaps → 409
        await expect409('update: draft → DAY_PARTIAL @ 9-1 (fo2 booked 10-2 → overlap)', () =>
            CampService.update(draftId, { date: DAY_PARTIAL, timeSlot: S.SLOT_9_1 } as any, ctx),
        );

        // POSITIVE: move it onto DAY_PARTIAL @ 6-10 (evening, free for fo2) → allowed
        await expectOk('update: draft → DAY_PARTIAL @ 6-10 (evening, free)', () =>
            CampService.update(draftId, { date: DAY_PARTIAL, timeSlot: S.SLOT_6_10 } as any, ctx),
        );
    }

    // eslint-disable-next-line no-console
    console.log('\n============ booking-availability access ============');

    const mrUser = await UserModel.findOne({ email: 'mr@seed.qms.test' });
    const availabilityBody = {
        projectID: project._id.toString(),
        lat: 19.076,
        lng: 72.8777,
        dateFrom: today,
        dateTo: addUTCDays(today, 6),
    };

    // POSITIVE: a customer MR (camp:book) on the project's tenant gets availability.
    const mrCtx = makeContext(customer, mr, mrUser ? { _id: mrUser._id.toString(), email: mrUser.email } : {}, [
        PERMISSIONS.CAMP.BOOK.code,
    ]);
    const mrResult = await expectOk('booking-availability: customer MR (own-tenant project) allowed', () =>
        CampService.bookingAvailability(availabilityBody as any, mrCtx),
    );
    if (mrResult) {
        // eslint-disable-next-line no-console
        console.log(`         → eligibleFoCount = ${mrResult.eligibleFoCount}`);

        // dates must be a MAP keyed by YYYY-MM-DD (not an array), each value = { available, slots }
        const partialKey = isoDay(DAY_PARTIAL);
        const isArray = Array.isArray(mrResult.dates);
        const entry = mrResult.dates?.[partialKey];
        // eslint-disable-next-line no-console
        console.log(`         → dates keys = ${JSON.stringify(Object.keys(mrResult.dates))}`);
        if (!isArray && entry && typeof entry.available === 'boolean' && entry.slots) {
            ok(`dates is a map keyed by date; dates["${partialKey}"] = { available:${entry.available}, slots:${JSON.stringify(entry.slots)} }`);
        } else {
            bad('dates map shape', `isArray=${isArray}, entry=${JSON.stringify(entry)}`);
        }
    }

    // PROJECT OWNERSHIP: a projectID the caller's tenant does not own → 404.
    await expect404('booking-availability: foreign/unknown project → 404', () =>
        CampService.bookingAvailability({ ...availabilityBody, projectID: '665f0c3a1a2b3c4d5e6f7a8a' } as any, mrCtx),
    );

    // SLOT RESTRICTION: narrow the project to a 2-slot subset → response must only carry those keys.
    const originalSlots = project.campTimeSlots;
    const subset = [S.SLOT_9_1, S.SLOT_6_10];
    await Project.updateOne({ _id: project._id }, { campTimeSlots: subset });
    const narrowed = await CampService.bookingAvailability(availabilityBody as any, mrCtx);
    const slotKeys = Object.keys(narrowed.dates[isoDay(DAY_PARTIAL)]?.slots || {});
    if (slotKeys.length === 2 && slotKeys.includes(S.SLOT_9_1) && slotKeys.includes(S.SLOT_6_10)) {
        ok(`slot restriction: response carries only project slots ${JSON.stringify(subset)}`);
    } else {
        bad('slot restriction', `expected only ${JSON.stringify(subset)}, got ${JSON.stringify(slotKeys)}`);
    }
    await Project.updateOne({ _id: project._id }, { campTimeSlots: originalSlots }); // restore

    // cleanup the camps this test created (leave the seed intact for re-runs)
    const createdIds = [eve, canc, draft].filter(Boolean).map((c: any) => c._id);
    if (createdIds.length) {
        await CampModel.deleteMany({ _id: { $in: createdIds } });
    }

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
        logger.error({ err }, 'Overlap e2e failed to run');
        await mongoose.disconnect();
        process.exit(1);
    });
