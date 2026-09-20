/**
 * Dummy-data seeder that builds a FULL, relationally-correct flow for live testing.
 *
 * Run (needs the rs0 replica set the app already uses — services run in transactions):
 *     npx tsx src/shared/env/script/seedDummyData.ts
 *
 * PREREQUISITE: the app must have booted at least once so the SYSTEM user/tenant/role types
 * (field-officer, sales-rep, camp-coordinator, pharma-*) are seeded. This script logs in "as"
 * that system user (god-mode) and drives the REAL services, so every entity is created through
 * the same rules the API enforces — nothing is hand-inserted past a validation.
 *
 * The chain it creates (each child has a real parent):
 *
 *   Platform (QMS) tenant 'qms'
 *     ├─ sales rep            (Role + User)                 → lead.salesPerson / project.salesRep
 *     ├─ project coordinator  (Role + User)                 → project.projectCoordinator
 *     └─ 4 field officers     (Role + User + GeoProfile)    → camp.fo   (3 near the point, 1 far)
 *
 *   Customer (pharma) tenant 'seed-acme'   (TenantService.create → tenant + admin + PG + pharma role types)
 *     └─ division 'seed-div'              (DivisionService.create → division + division head)
 *          └─ RSM → ASM → MR             (RoleService.create, full supervisor chain)
 *     ├─ contact                         → lead.contactPerson / project.marketingContact
 *     ├─ doctor
 *     └─ LEAD  ──advance──▶ won
 *          └─ PROJECT ──go live──▶ live
 *               └─ CAMPS (confirmed/live) that block FO slots + one cancelled (ignored)
 *
 * Idempotent: each run first wipes the data it created before (by seed tenant / role-code prefix /
 * email domain). It never touches the system tenant or any non-seed data.
 *
 * After it runs, read the printed summary for exactly how to test booking availability.
 */

// MUST be first: registers the Zod `.openapi()` extension (extendZodWithOpenApi) as a side effect,
// before any validator module (loaded transitively via the services below) is evaluated.
import '../../config/swagger/swagger.registry';

import mongoose from 'mongoose';

import connectDB from '../../config/connectDB';
import logger from '../../utils/logger';
import ENV from '../../config/app.config';
import { startOfUTCDay } from '../../utils/dates';
import { PERMISSIONS } from '../permissions';

// models (loading the system actor + cleanup only)
import { TenantModel } from '../../../modules/access-management/tenant/tenant.model';
import { RoleModel } from '../../../modules/access-management/role/role.model';
import { RoleTypeModel } from '../../../modules/access-management/role-type/roleType.model';
import { UserModel } from '../../../modules/user/user.model';
import { PermissionGroupModel } from '../../../modules/access-management/permission-group/permissionGroup.model';
import { DivisionModel } from '../../../modules/crm/division/division.model';
import { ContactModel } from '../../../modules/crm/contact/contact.model';
import { DoctorModel } from '../../../modules/crm/doctor/doctor.model';
import { LeadModel } from '../../../modules/crm/lead/lead.model';
import { Project } from '../../../modules/crm/project/project.model';
import { geoProfileModel } from '../../../modules/operations/geoProfile/geoProfile.model';
import { CampModel } from '../../../modules/operations/camp/camp.model';

// services (the real create flows)
import { TenantService } from '../../../modules/access-management/tenant/tenant.service';
import { RoleService } from '../../../modules/access-management/role/role.service';
import { DivisionService } from '../../../modules/crm/division/division.service';
import { ContactService } from '../../../modules/crm/contact/contact.service';
import { DoctorService } from '../../../modules/crm/doctor/doctor.service';
import { LeadService } from '../../../modules/crm/lead/lead.service';
import { ProjectService } from '../../../modules/crm/project/project.service';
import { GeoProfileService } from '../../../modules/operations/geoProfile/geoProfile.service';
import { CampService } from '../../../modules/operations/camp/camp.service';

// constants
import { TENANT_TYPE } from '../../../modules/access-management/tenant/tenant.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../../modules/access-management/role-type/roleType.constants';
import { CAMP_STATUSES, CAMP_TIME_SLOTS } from '../../../modules/operations/camp/camp.constants';
import { GEO_PROFILE_TYPES } from '../../../modules/operations/geoProfile/geoProfile.constants';
import { DIVISION_THERAPY } from '../../../modules/crm/division/division.constants';
import { DOCTOR_SPECIALIZATION } from '../../../modules/crm/doctor/doctor.constants';
import { CONTACT_TYPES } from '../../../modules/crm/contact/contact.constants';
import { LEAD_STATUSES, LEAD_PROJECT_TYPES } from '../../../modules/crm/lead/lead.constants';
import { PROJECT_STATUS, PROJECT_THERAPY_TYPES, PROJECT_TYPES, PAYMENT_TERMS } from '../../../modules/crm/project/project.constants';

// ================================ CONFIG ================================

const SEED = {
    tenantCode: 'seed-acme',
    tenantName: 'Seed Acme Pharma',
    divisionCode: 'seed-div',
    rolePrefix: 'seed-', // platform-side seed role codes — used for cleanup
    emailDomain: 'seed.qms.test', // every seeded user's email ends with this — used for cleanup
    password: 'Test@123', // login password for every seeded user
};

// The point the availability search runs AROUND (Mumbai). GeoJSON order: [lng, lat].
const TEST_POINT = { lng: 72.8777, lat: 19.076 };

// Field officers (QMS platform staff). First three reach TEST_POINT; the last is in Delhi (far —
// the coverage-radius filter must drop it, so it can never be an eligible FO).
const FO_DEFS = [
    { key: 'fo1', first: 'Field', last: 'One', coordinates: [72.8777, 19.076], coverageRadius: 35000 },
    { key: 'fo2', first: 'Field', last: 'Two', coordinates: [72.95, 19.1], coverageRadius: 35000 },
    { key: 'fo3', first: 'Field', last: 'Three', coordinates: [73.02, 19.2], coverageRadius: 35000 },
    { key: 'fo4', first: 'Field', last: 'Four', coordinates: [77.209, 28.6139], coverageRadius: 35000 },
];

// ================================ HELPERS ================================

// a RegisterUserPayload for a seeded user — deterministic email so cleanup can find it
const reg = (local: string, first: string, last: string) => ({
    firstName: first,
    lastName: last,
    email: `${local}@${SEED.emailDomain}`,
    password: SEED.password,
    phone: '9990000000',
});

const addUTCDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

// Build a god-mode request context (system:manage) so services run unscoped, mirroring a logged-in
// system user. Methods reference `this`, matching the real contextBuilder's semantics.
const makeGodContext = (actor: { user: any; role: any; tenant: any }): any => {
    const SYSTEM_MANAGE = PERMISSIONS.SYSTEM.MANAGE.code;
    return {
        requestID: 'seed-script',
        ipAddress: 'seed-script',
        user: actor.user,
        role: actor.role,
        tenant: actor.tenant,
        permissions: [SYSTEM_MANAGE],
        logger,
        setUser(u: any) {
            this.user = u;
        },
        setRole(r: any) {
            this.role = r;
        },
        setTenant(t: any) {
            this.tenant = t;
        },
        setPermissions(p: string[]) {
            this.permissions = p;
        },
        hasAnyPermissions(required: string[]) {
            if (this.permissions.includes(SYSTEM_MANAGE)) {
                return true;
            }
            return required.some((code) => this.permissions.includes(code));
        },
        hasAllPermissions(required: string[]) {
            if (this.permissions.includes(SYSTEM_MANAGE)) {
                return true;
            }
            return required.every((code) => this.permissions.includes(code));
        },
        requirePermissions() {
            return true;
        },
        where() {
            // platform actor → unscoped (god-mode); customer actor → tenant-pinned
            if (this.tenant?.type === TENANT_TYPE.PLATFORM) {
                return {};
            }
            return { tenant: this.tenant?._id || this.tenant?.id };
        },
    };
};

// ================================ CLEANUP ================================

const wipePreviousSeed = async () => {
    logger.info('Wiping any previous seed data...');

    //1: customer-tenant subtree — everything scoped to the seed customer tenant
    const oldCustomer = await TenantModel.findOne({ code: SEED.tenantCode });
    if (oldCustomer) {
        const t = oldCustomer._id;
        await Promise.all([
            CampModel.deleteMany({ tenant: t }),
            Project.deleteMany({ tenant: t }),
            LeadModel.deleteMany({ tenant: t }),
            ContactModel.deleteMany({ tenant: t }),
            DoctorModel.deleteMany({ tenant: t }),
            DivisionModel.deleteMany({ tenant: t }),
            RoleModel.deleteMany({ tenant: t }),
            RoleTypeModel.deleteMany({ tenant: t }),
            PermissionGroupModel.deleteMany({ tenant: t }),
        ]);
        await TenantModel.deleteOne({ _id: t });
    }

    //2: platform-side seed roles (code prefix) + their geo profiles (roles live on the shared 'qms'
    // tenant, so we match by code, never by tenant)
    const platformSeedRoles = await RoleModel.find({ code: { $regex: `^${SEED.rolePrefix}` } }).select('_id');
    const roleIds = platformSeedRoles.map((r) => r._id);
    if (roleIds.length) {
        await geoProfileModel.deleteMany({ role: { $in: roleIds } });
        await RoleModel.deleteMany({ _id: { $in: roleIds } });
    }

    //3: any seeded users (matched by email domain)
    await UserModel.deleteMany({ email: { $regex: `@${SEED.emailDomain}$` } });

    logger.info('Previous seed data wiped');
};

// ================================ SEED ================================

const seed = async () => {
    //0: load the system actor seeded on boot + build a god-mode context
    const systemTenant = await TenantModel.findOne({ code: ENV.App.SystemTenantCode });
    const systemUser = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
    const systemRole = await RoleModel.findOne({ code: 'system' }).populate('type');
    if (!systemTenant || !systemUser || !systemRole) {
        throw new Error(
            'System tenant/user/role not found — start the app once (npm run dev) so the system seed runs, then retry.',
        );
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

    const platformTenantId = systemTenant._id.toString();
    const { PLATFORM, CUSTOMER } = ALLOWED_ROLETYPE_CODES;

    // resolve the platform role types seeded on boot
    const [foType, salesRepType, coordType] = await Promise.all([
        RoleTypeModel.findOne({ tenant: systemTenant._id, code: PLATFORM.FIELD_OFFICER }),
        RoleTypeModel.findOne({ tenant: systemTenant._id, code: PLATFORM.SALES_REP }),
        RoleTypeModel.findOne({ tenant: systemTenant._id, code: PLATFORM.CAMP_COORDINATOR_SCREENING }),
    ]);
    if (!foType || !salesRepType || !coordType) {
        throw new Error('Platform role types (field-officer/sales-rep/camp-coordinator-screening) not found — boot the app once to seed them.');
    }

    //1: platform staff — a sales rep and a project coordinator (QMS internal)
    const salesRep = await RoleService.create(
        {
            code: `${SEED.rolePrefix}sales-rep`,
            name: 'Seed Sales Rep',
            description: 'Seed QMS sales representative',
            tenant: platformTenantId,
            type: salesRepType._id.toString(),
            user: reg('salesrep', 'Sales', 'Rep'),
            permissions: [],
        } as any,
        ctx,
    );
    const coordinator = await RoleService.create(
        {
            code: `${SEED.rolePrefix}coordinator`,
            name: 'Seed Camp Coordinator',
            description: 'Seed QMS screening camp coordinator',
            tenant: platformTenantId,
            type: coordType._id.toString(),
            user: reg('coordinator', 'Camp', 'Coordinator'),
            permissions: [],
        } as any,
        ctx,
    );

    //2: field officers (role + user + geo profile)
    const fos: Record<string, any> = {};
    for (const def of FO_DEFS) {
        const role = await RoleService.create(
            {
                code: `${SEED.rolePrefix}${def.key}`,
                name: `Seed ${def.first} ${def.last}`,
                description: 'Seed field officer',
                tenant: platformTenantId,
                type: foType._id.toString(),
                user: reg(def.key, def.first, def.last),
                permissions: [],
            } as any,
            ctx,
        );
        await GeoProfileService.create(
            {
                role: role._id.toString(),
                type: GEO_PROFILE_TYPES.FO,
                coordinates: def.coordinates,
                coverageRadius: def.coverageRadius,
                city: 'Mumbai',
                state: 'Maharashtra',
            } as any,
            ctx,
        );
        fos[def.key] = role;
    }

    //3: customer (pharma) tenant — createTenant also mints admin + permission group + pharma role types
    const customer = await TenantService.create(
        {
            code: SEED.tenantCode,
            name: SEED.tenantName,
            description: 'Dummy pharma customer for booking-availability testing',
            owner: reg('admin', 'Acme', 'Admin'),
        } as any,
        ctx,
    );
    const customerId = customer._id.toString();

    // resolve the pharma role types provisioned for this customer tenant
    const [rsmType, asmType, mrType] = await Promise.all([
        RoleTypeModel.findOne({ tenant: customer._id, code: CUSTOMER.PHARMA_RSM }),
        RoleTypeModel.findOne({ tenant: customer._id, code: CUSTOMER.PHARMA_ASM }),
        RoleTypeModel.findOne({ tenant: customer._id, code: CUSTOMER.PHARMA_MR }),
    ]);
    if (!rsmType || !asmType || !mrType) {
        throw new Error('Pharma role types were not provisioned for the customer tenant.');
    }

    //4: division (createDivision also mints the division head role + user)
    const division = await DivisionService.create(
        {
            tenant: customerId,
            code: SEED.divisionCode,
            name: 'Seed Cardio Division',
            therapy: [DIVISION_THERAPY.CARDIOLOGY],
            head: reg('divhead', 'Division', 'Head'),
        } as any,
        ctx,
    );
    const divisionId = division._id.toString();
    const divisionHead = await RoleModel.findById(division.owner);
    if (!divisionHead) {
        throw new Error('Division head role was not created.');
    }

    //5: pharma field-force chain — RSM → ASM → MR (codes auto-generated; supervisor required by tree)
    const rsm = await RoleService.create(
        {
            name: 'Seed RSM',
            description: 'Seed regional sales manager',
            tenant: customerId,
            type: rsmType._id.toString(),
            division: divisionId,
            supervisor: divisionHead._id.toString(),
            user: reg('rsm', 'Regional', 'Manager'),
            permissions: [],
        } as any,
        ctx,
    );
    const asm = await RoleService.create(
        {
            name: 'Seed ASM',
            description: 'Seed area sales manager',
            tenant: customerId,
            type: asmType._id.toString(),
            division: divisionId,
            supervisor: rsm._id.toString(),
            user: reg('asm', 'Area', 'Manager'),
            permissions: [],
        } as any,
        ctx,
    );
    const mr = await RoleService.create(
        {
            name: 'Seed MR',
            description: 'Seed medical representative',
            tenant: customerId,
            type: mrType._id.toString(),
            division: divisionId,
            supervisor: asm._id.toString(),
            user: reg('mr', 'Medical', 'Rep'),
            permissions: [],
        } as any,
        ctx,
    );

    //6: contact (customer-side) — used as lead.contactPerson and project.marketingContact
    const contact = await ContactService.create(
        {
            tenant: customerId,
            division: divisionId,
            name: 'Seed Marketing Contact',
            type: CONTACT_TYPES.CUSTOMER,
            email: `contact@${SEED.emailDomain}`,
            phone: '9990000010',
            designation: 'Marketing Lead',
        } as any,
        ctx,
    );

    //7: doctor
    const doctor = await DoctorService.create(
        {
            tenant: customerId,
            division: divisionId,
            pharmaCode: 'SEED-DOC-1',
            name: 'Dr Seed Sharma',
            specialization: DOCTOR_SPECIALIZATION.GP,
            mobile: '9998887770',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400058',
            email: `doctor@${SEED.emailDomain}`,
        } as any,
        ctx,
    );

    //8: LEAD → advance through the pipeline to WON
    const lead = await LeadService.create(
        {
            tenant: customerId,
            division: divisionId,
            contactPerson: contact._id.toString(),
            salesPerson: salesRep._id.toString(),
            title: 'Cardio screening drive Q3',
            problemStatement: 'Low patient identification in tier-2 cities',
            numberOfMRS: 38,
            projectType: LEAD_PROJECT_TYPES.SCREENING,
            // supplied explicitly: driving the service directly skips the controller's Zod layer,
            // so the validator's default (confidence=35) isn't applied, and the model requires it.
            confidence: 35,
        } as any,
        ctx,
    );
    const leadId = lead._id.toString();
    for (const to of [LEAD_STATUSES.QUALIFIED, LEAD_STATUSES.PROPOSAL, LEAD_STATUSES.NEGOTIATION, LEAD_STATUSES.WON]) {
        await LeadService.moveStage(leadId, { to, reason: 'Seed: advancing lead' }, ctx);
    }

    //9: PROJECT (from the won lead) → go LIVE
    const project = await ProjectService.create(
        {
            lead: leadId,
            name: 'Cardio Screening Project',
            therapy: PROJECT_THERAPY_TYPES.CARDIOLOGY,
            type: [PROJECT_TYPES.SCREENING_CAMP],
            salesRep: salesRep._id.toString(),
            projectCoordinator: coordinator._id.toString(),
            marketingContact: contact._id.toString(),
            paymentTerms: PAYMENT_TERMS.NET_30,
            campCost: 15000,
            totalCamps: 40,
            campTimeSlots: Object.values(CAMP_TIME_SLOTS),
            whoCanBookCamp: [CUSTOMER.PHARMA_MR],
        } as any,
        ctx,
    );
    const projectId = project._id.toString();
    await ProjectService.moveStage(projectId, { to: PROJECT_STATUS.LIVE, reason: 'Seed: PO received, going live' }, ctx);

    //10: CAMPS — block specific FO slots on specific days (confirmed/live hold a slot; cancelled does not)
    const today = startOfUTCDay(new Date());
    const DAY_PARTIAL = addUTCDays(today, 2); // daytime blocked for all eligible FOs, evening free
    const DAY_FULL = addUTCDays(today, 3); // every slot blocked → whole date unavailable
    const DAY_CANCELLED = addUTCDays(today, 4); // one cancelled camp → ignored → date available

    const S = CAMP_TIME_SLOTS;
    const location = {
        addressLine1: '12 MG Road',
        locality: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400058',
        coordinates: [TEST_POINT.lng, TEST_POINT.lat],
    };

    // [foKey, date, timeSlot, finalStatus]
    const campSpecs: [string, Date, any, string][] = [
        // DAY_PARTIAL — each eligible FO takes a different daytime slot (they overlap → all 3 daytime
        // slots blocked for everyone), evening stays free.
        ['fo1', DAY_PARTIAL, S.SLOT_9_1, CAMP_STATUSES.LIVE],
        ['fo2', DAY_PARTIAL, S.SLOT_10_2, CAMP_STATUSES.CONFIRMED],
        ['fo3', DAY_PARTIAL, S.SLOT_11_3, CAMP_STATUSES.CONFIRMED],

        // DAY_FULL — every eligible FO has a daytime AND an evening camp → all 4 slots blocked.
        ['fo1', DAY_FULL, S.SLOT_9_1, CAMP_STATUSES.CONFIRMED],
        ['fo1', DAY_FULL, S.SLOT_6_10, CAMP_STATUSES.CONFIRMED],
        ['fo2', DAY_FULL, S.SLOT_9_1, CAMP_STATUSES.CONFIRMED],
        ['fo2', DAY_FULL, S.SLOT_6_10, CAMP_STATUSES.LIVE],
        ['fo3', DAY_FULL, S.SLOT_9_1, CAMP_STATUSES.CONFIRMED],
        ['fo3', DAY_FULL, S.SLOT_6_10, CAMP_STATUSES.CONFIRMED],

        // DAY_CANCELLED — a cancelled camp must NOT hold a slot.
        ['fo1', DAY_CANCELLED, S.SLOT_9_1, CAMP_STATUSES.CANCELLED],
    ];

    for (const [foKey, date, timeSlot, finalStatus] of campSpecs) {
        const camp = await CampService.create(
            {
                tenant: customerId,
                division: divisionId,
                project: projectId,
                doctor: doctor._id.toString(),
                mr: mr._id.toString(),
                fo: fos[foKey]._id.toString(),
                date,
                timeSlot,
                location,
            } as any,
            ctx,
        );
        const campId = camp._id.toString();

        // camps are born `requested`; move each to its target via the real state machine
        if (finalStatus === CAMP_STATUSES.CANCELLED) {
            await CampService.moveStage(campId, { to: CAMP_STATUSES.CANCELLED, reason: 'Seed: cancelled demo' }, ctx);
        } else {
            await CampService.moveStage(campId, { to: CAMP_STATUSES.CONFIRMED, reason: 'Seed: confirming camp' }, ctx);
            if (finalStatus === CAMP_STATUSES.LIVE) {
                await CampService.moveStage(campId, { to: CAMP_STATUSES.LIVE, reason: 'Seed: camp going live' }, ctx);
            }
        }
    }

    return { customer, division, project, lead, doctor, mr, DAY_PARTIAL, DAY_FULL, DAY_CANCELLED, today };
};

// ================================ MAIN ================================

const main = async () => {
    await connectDB();
    await wipePreviousSeed();
    const result = await seed();

    const rangeFrom = isoDay(result.today);
    const rangeTo = isoDay(addUTCDays(result.today, 6));

    logger.info('Dummy data seeded successfully.');

    /* eslint-disable no-console */
    console.log(`
============================================================
  SEED COMPLETE — full flow created
============================================================
Customer tenant : ${SEED.tenantCode}   (admin: admin@${SEED.emailDomain} / ${SEED.password})
Division        : ${SEED.divisionCode}
Lead            : ${result.lead.code}  (advanced to WON)
Project         : ${result.project.code}  (LIVE)
Chain           : lead → project → camps ; MR → ASM → RSM → division head

Test point (Mumbai) : lng=${TEST_POINT.lng}, lat=${TEST_POINT.lat}
Eligible FOs        : fo1, fo2, fo3   (fo4 is in Delhi → out of range, filtered out)

Seeded camp days:
  ${isoDay(result.DAY_PARTIAL)}  → daytime (9-1/10-2/11-3) UNAVAILABLE, 6-10 free → DATE AVAILABLE
  ${isoDay(result.DAY_FULL)}  → ALL 4 slots UNAVAILABLE                      → DATE UNAVAILABLE
  ${isoDay(result.DAY_CANCELLED)}  → one CANCELLED camp (ignored)                 → DATE AVAILABLE
  (any other day in range has no camps                              → DATE AVAILABLE)

--- STEP 1: log in as the seeded pharma MR (customer tenant, holds camp:book) ---
NOTE: /camps/booking-availability is restricted to camp:book holders on a CUSTOMER tenant.
The system user (platform tenant) will get 403 here — use the MR login below.
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"mr@${SEED.emailDomain}","password":"${SEED.password}"}'

--- STEP 2: booking availability (projectID accepted but unused — any valid ObjectId) ---
curl -s -b cookies.txt -X POST http://localhost:3000/api/v1/camps/booking-availability \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectID":"${result.project._id.toString()}",
    "lng":${TEST_POINT.lng},
    "lat":${TEST_POINT.lat},
    "dateFrom":"${rangeFrom}",
    "dateTo":"${rangeTo}"
  }'

Expect: eligibleFoCount = 3, and the three seeded days match the notes above.
(Or use Swagger at http://localhost:3000/api-docs — it keeps the login cookie for you.)

Other seeded logins (password "${SEED.password}"): system@... (platform → 403 here), salesrep@${SEED.emailDomain}
============================================================
`);
    /* eslint-enable no-console */
};

main()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        logger.error({ err }, 'Dummy data seeding failed');
        await mongoose.disconnect();
        process.exit(1);
    });
