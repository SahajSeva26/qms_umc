// QA data seeding script — populates a fresh qms_umc database with a small,
// realistic dataset spanning every module reachable through the real REST
// API, so testers get populated screens everywhere instead of empty states.
//
// Run against a LIVE backend (this hits the real HTTP API as system@gmail.com,
// it does not touch Mongoose directly):
//   npx tsx scripts/seedQaData.ts
//
// Assumes: backend already running on http://localhost:3000 (override via
// SEED_API_BASE_URL env var), and the built-in boot seed (system@gmail.com /
// Test@123) has already run (it runs automatically on every server start).
//
// NOT idempotent: entities with unique natural keys (tenant/division/doctor
// codes, emails) will 409 on a second run against the same database. Intended
// for a single run against a fresh/disposable local DB — see
// feedback_local_db_is_disposable.
//
// Deliberately skipped (cannot be seeded through the real API):
//   - QA Feedback: requires a live Jira integration (no local Jira creds).
//   - Inventory Ledger: has no create endpoint at all; it is written
//     internally by Inventory Request stage transitions, which THIS script
//     does drive, so ledger rows appear naturally without a dedicated step.
//   - Test (operations/test): completing a Screening (a prerequisite for
//     creating a Test) requires POST /screenings/:id/verify-consent with the
//     real OTP, which is generated server-side and never returned by any API
//     response by design (it's meant to reach the patient via SMS). SMS/OTP
//     delivery is not wired in yet as a product feature — not a script
//     limitation — so screenings seeded here stay in 'pending' status.

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.SEED_API_BASE_URL || 'http://localhost:3000/api/v1';
const PASSWORD = 'Test@123';

// ===================== tiny HTTP client with cookie replay =====================
// No cookie-jar dependency needed: capture Set-Cookie from /auth/login once,
// replay it verbatim on every subsequent request via this one axios instance.
function makeClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
  let cookieHeader = '';

  client.interceptors.request.use((config) => {
    if (cookieHeader) config.headers.Cookie = cookieHeader;
    return config;
  });
  client.interceptors.response.use((res) => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie?.length) {
      cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
    }
    return res;
  });
  return client;
}

// The global rate limiter caps ALL /api/v1 traffic at 100 req/min per IP —
// one request every 600ms minimum. Each logical "create" in this script can
// fan out to 2-3 real HTTP calls (create + a GET to resolve the nested
// user + a PUT to activate it), so pace well above the bare minimum, and
// retry with backoff on a 429 as a safety net rather than aborting the run.
const PACE_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function call<T = any>(
  client: AxiosInstance,
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  await sleep(PACE_MS);
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await client.request({ method, url: path, data: body });
    if (res.status === 429) {
      const backoffMs = 5000 * (attempt + 1);
      console.log(`  [429] rate limited on ${method.toUpperCase()} ${path} — waiting ${backoffMs / 1000}s and retrying (attempt ${attempt + 1}/5)`);
      await sleep(backoffMs);
      continue;
    }
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status, data: res.data?.data };
    }
    return { ok: false, status: res.status, error: res.data?.message || JSON.stringify(res.data) };
  }
  return { ok: false, status: 429, error: 'Too many requests, please try again later (exhausted retries)' };
}

// ===================== run log =====================
const created: string[] = [];
const skipped: string[] = [];
const failed: string[] = [];

function logCreated(label: string, id?: string) {
  created.push(`${label}${id ? ` (${id})` : ''}`);
  console.log(`  [ok] ${label}${id ? ` -> ${id}` : ''}`);
}
function logSkipped(label: string, reason: string) {
  skipped.push(`${label} — ${reason}`);
  console.log(`  [skip] ${label} — ${reason}`);
}
function logFailed(label: string, reason: string) {
  failed.push(`${label} — ${reason}`);
  console.log(`  [FAIL] ${label} — ${reason}`);
}

// Wraps a create call: logs success/failure, returns the created id (or null on failure).
async function create(
  client: AxiosInstance,
  label: string,
  path: string,
  body: unknown,
): Promise<string | null> {
  const res = await call(client, 'post', path, body);
  if (res.ok) {
    const id = (res.data as any)?.id;
    logCreated(label, id);
    return id ?? null;
  }
  logFailed(label, `HTTP ${res.status} — ${res.error}`);
  return null;
}

// ===================== main =====================
async function main() {
  console.log(`Seeding QA data against ${BASE_URL}\n`);

  const client = makeClient();

  console.log('== Login as system@gmail.com ==');
  const login = await call(client, 'post', '/auth/login', { email: 'system@gmail.com', password: PASSWORD });
  if (!login.ok) {
    console.error(`Could not log in as system@gmail.com: HTTP ${login.status} — ${login.error}`);
    console.error('Is the backend running and has it completed its boot seed?');
    process.exit(1);
  }
  console.log('  logged in\n');

  // Platform tenant id + platform RoleType ids (already seeded on boot) are
  // needed repeatedly below — resolve them once.
  console.log('== Resolve platform tenant + RoleTypes ==');
  const platformTenantRes = await call(client, 'get', '/tenants?code=qms');
  const platformTenantId = (platformTenantRes.data as any)?.items?.[0]?.id;
  if (!platformTenantId) {
    console.error('Could not resolve the platform tenant (code "qms") — aborting.');
    process.exit(1);
  }
  console.log(`  platform tenant: ${platformTenantId}`);

  async function getRoleTypeId(code: string, tenant: string): Promise<string | null> {
    const res = await call(client, 'get', `/role-types?code=${code}&tenant=${tenant}`);
    return (res.data as any)?.items?.[0]?.id ?? null;
  }

  const roleTypeIds = {
    salesRep: await getRoleTypeId('sales-rep', platformTenantId),
    salesHead: await getRoleTypeId('sales-head', platformTenantId),
    fieldOfficer: await getRoleTypeId('field-officer', platformTenantId),
    campCoordScreening: await getRoleTypeId('camp-coordinator-screening', platformTenantId),
    opsManagerScreening: await getRoleTypeId('operation-manager-screening', platformTenantId),
    inventoryManager: await getRoleTypeId('inventory-manager', platformTenantId),
    financeManager: await getRoleTypeId('finance-manager', platformTenantId),
  };
  for (const [k, v] of Object.entries(roleTypeIds)) {
    if (!v) console.warn(`  WARNING: could not resolve platform RoleType "${k}" — related roles will be skipped`);
  }
  console.log();

  async function activateUser(userId: string | undefined, label: string) {
    if (!userId) return;
    const res = await call(client, 'put', `/users/${userId}`, { status: 'active' });
    if (!res.ok) logFailed(`activate ${label}`, `HTTP ${res.status} — ${res.error}`);
  }

  // Every Role/Division create response nests the created Role — but not the
  // User id directly in most cases. Resolve the role's own `user` field via a
  // follow-up GET so we can activate it (new users start inactive). Note:
  // GET /roles/:id populates `user` but RoleMapper does NOT remap the nested
  // user's Mongo `_id` to `id` — it comes back as `_id`, unlike every
  // top-level mapped entity in this app.
  async function getRoleUserId(roleId: string | null): Promise<string | undefined> {
    if (!roleId) return undefined;
    const res = await call(client, 'get', `/roles/${roleId}`);
    const user = (res.data as any)?.user;
    return typeof user === 'string' ? user : user?._id;
  }

  // ===================== 1. Platform staff (sales-rep, sales-head, field officers, coordinators) =====================
  console.log('== Platform staff (sales, field officers, coordinators) ==');

  async function createPlatformRole(opts: {
    code: string; name: string; typeId: string | null;
    firstName: string; lastName: string; email: string; phone: string;
  }): Promise<string | null> {
    if (!opts.typeId) { logSkipped(opts.name, 'RoleType not resolved'); return null; }
    const roleId = await create(client, opts.name, '/roles', {
      code: opts.code, name: opts.name, type: opts.typeId, tenant: platformTenantId,
      user: { firstName: opts.firstName, lastName: opts.lastName, email: opts.email, password: PASSWORD, phone: opts.phone },
    });
    await activateUser(await getRoleUserId(roleId), opts.name);
    return roleId;
  }

  const salesRepId = await createPlatformRole({
    code: 'sales-rep-priya', name: 'Sales Rep (Priya)', typeId: roleTypeIds.salesRep,
    firstName: 'Priya', lastName: 'Sharma', email: 'sales.priya@qmstest.com', phone: '9800000001',
  });
  const salesHeadId = await createPlatformRole({
    code: 'sales-head-arjun', name: 'Sales Head (Arjun)', typeId: roleTypeIds.salesHead,
    firstName: 'Arjun', lastName: 'Verma', email: 'saleshead.arjun@qmstest.com', phone: '9800000002',
  });
  const coordinatorId = await createPlatformRole({
    code: 'coordinator-neha', name: 'Camp Coordinator (Neha)', typeId: roleTypeIds.campCoordScreening,
    firstName: 'Neha', lastName: 'Kapoor', email: 'coordinator.neha@qmstest.com', phone: '9800000003',
  });
  const opsManagerId = await createPlatformRole({
    code: 'opsmanager-rohit', name: 'Operations Manager (Rohit)', typeId: roleTypeIds.opsManagerScreening,
    firstName: 'Rohit', lastName: 'Singh', email: 'opsmanager.rohit@qmstest.com', phone: '9800000004',
  });
  const inventoryManagerId = await createPlatformRole({
    code: 'inventorymgr-sana', name: 'Inventory Manager (Sana)', typeId: roleTypeIds.inventoryManager,
    firstName: 'Sana', lastName: 'Khan', email: 'inventory.sana@qmstest.com', phone: '9800000005',
  });
  const financeManagerId = await createPlatformRole({
    code: 'financemgr-vikas', name: 'Finance Manager (Vikas)', typeId: roleTypeIds.financeManager,
    firstName: 'Vikas', lastName: 'Gupta', email: 'finance.vikas@qmstest.com', phone: '9800000006',
  });

  // Two Field Officers with GeoProfiles near two different real Indian cities
  // — enough for camps in either city to auto-allocate, and for the
  // coverage-radius picker work to have real, distinct candidates.
  interface FoSeed { code: string; label: string; firstName: string; lastName: string; email: string; phone: string; city: string; state: string; pincode: string; coordinates: [number, number] }
  const foSeeds: FoSeed[] = [
    { code: 'fo-gurugram-amit', label: 'Field Officer (Amit, Gurugram)', firstName: 'Amit', lastName: 'FO', email: 'fo.amit@qmstest.com', phone: '9800000010', city: 'Gurugram', state: 'Haryana', pincode: '122001', coordinates: [77.0266, 28.4595] },
    { code: 'fo-mumbai-kavita', label: 'Field Officer (Kavita, Mumbai)', firstName: 'Kavita', lastName: 'FO', email: 'fo.kavita@qmstest.com', phone: '9800000011', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', coordinates: [72.8311, 18.9647] },
  ];
  const foRoleIds: string[] = [];
  for (const fo of foSeeds) {
    const roleId = await createPlatformRole({
      code: fo.code, name: fo.label, typeId: roleTypeIds.fieldOfficer,
      firstName: fo.firstName, lastName: fo.lastName, email: fo.email, phone: fo.phone,
    });
    if (roleId) {
      foRoleIds.push(roleId);
      await create(client, `GeoProfile for ${fo.label}`, '/geo-profiles', {
        role: roleId, type: 'fo', coordinates: fo.coordinates, coverageRadius: 40000,
        city: fo.city, state: fo.state, pincode: fo.pincode, country: 'India',
      });
    }
  }
  console.log();

  // ===================== 2. Inventory & vendor catalog (independent) =====================
  console.log('== Inventory & vendor catalog ==');

  const vendorId = await create(client, 'Vendor (MedEquip Supplies)', '/vendor-masters', {
    code: 'vnd-medequip', name: 'MedEquip Supplies Pvt Ltd',
    contacts: [{ name: 'Suresh Rao', number: '9811111111', email: 'suresh@medequip.example.com', designation: 'Account Manager' }],
    address: { addressLine1: '12 Industrial Area', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
  });

  const inventoryDeviceMasterId = await create(client, 'Inventory Master: BP Monitor', '/inventory-masters', {
    code: 'inv-bp-monitor', name: 'Digital BP Monitor', description: 'Automatic digital blood pressure monitor', type: 'device', sku: 'BPM-100', unit: 'unit', minStock: 5,
  });
  const inventoryDeviceMaster2Id = await create(client, 'Inventory Master: Glucometer', '/inventory-masters', {
    code: 'inv-glucometer', name: 'Glucometer', description: 'Blood glucose measurement device', type: 'device', sku: 'GLU-200', unit: 'unit', minStock: 5,
  });
  const inventoryConsumableMasterId = await create(client, 'Inventory Master: Test Strips', '/inventory-masters', {
    code: 'inv-test-strips', name: 'Glucose Test Strips', description: 'Consumable test strips for glucometer', type: 'consumable', sku: 'STR-50', unit: 'box', minStock: 20,
  });
  const inventoryConsumableMaster2Id = await create(client, 'Inventory Master: Lancets', '/inventory-masters', {
    code: 'inv-lancets', name: 'Lancets', description: 'Single-use lancets for finger-prick tests', type: 'consumable', sku: 'LAN-100', unit: 'box', minStock: 20,
  });

  let deviceId: string | null = null;
  let consumableId: string | null = null;
  if (inventoryDeviceMasterId && vendorId) {
    deviceId = await create(client, 'Device: BP Monitor #1', '/inventory-devices', {
      item: inventoryDeviceMasterId, vendor: vendorId, serialNumber: 'BPM-100-0001',
    });
  }
  if (inventoryConsumableMasterId && vendorId) {
    consumableId = await create(client, 'Consumable: Test Strips batch', '/inventory-consumables', {
      item: inventoryConsumableMasterId, vendor: vendorId, batch: 'BATCH-2026-01',
      manufacturingDate: '2026-01-01', quantity: 200,
    });
  }
  console.log();

  // ===================== 3. Test Master catalog (independent) =====================
  console.log('== Test Master catalog ==');
  const testMasterIds: Record<string, string | null> = {};
  testMasterIds.bloodPressure = await create(client, 'Test Master: Blood Pressure Check', '/test-masters', {
    name: 'Blood Pressure Check', therapy: 'cardiology', campType: 'screening', duration: 10, price: 100,
    consumption: consumableId ? [{ item: inventoryConsumableMasterId, rate: 1 }] : undefined,
  });
  testMasterIds.bloodGlucose = await create(client, 'Test Master: Blood Glucose Test', '/test-masters', {
    name: 'Blood Glucose Test', therapy: 'diabetes', campType: 'screening', duration: 15, price: 150,
    consumption: inventoryConsumableMaster2Id ? [{ item: inventoryConsumableMaster2Id, rate: 1 }] : undefined,
  });
  console.log();

  // ===================== 4. Customer tenants (pharma companies) =====================
  console.log('== Customer tenants (pharma companies) ==');

  interface TenantSeed {
    code: string; name: string; ownerFirst: string; ownerLast: string; ownerEmail: string; ownerPhone: string;
    divisions: { code: string; name: string; therapy: string[]; headFirst: string; headLast: string; headEmail: string; headPhone: string }[];
  }
  const tenantSeeds: TenantSeed[] = [
    {
      code: 'medicorp', name: 'MediCorp Pharmaceuticals',
      ownerFirst: 'Anil', ownerLast: 'Mehta', ownerEmail: 'admin.medicorp@qmstest.com', ownerPhone: '9800001001',
      divisions: [
        { code: 'medicorp-cardio', name: 'MediCorp Cardiology Division', therapy: ['cardiology'], headFirst: 'Deepa', headLast: 'Nair', headEmail: 'divhead.medicorp.cardio@qmstest.com', headPhone: '9800001010' },
        { code: 'medicorp-diabetes', name: 'MediCorp Diabetes Division', therapy: ['diabetes'], headFirst: 'Karan', headLast: 'Malhotra', headEmail: 'divhead.medicorp.diabetes@qmstest.com', headPhone: '9800001011' },
      ],
    },
    {
      code: 'wellnex', name: 'WellNex Life Sciences',
      ownerFirst: 'Reema', ownerLast: 'Iyer', ownerEmail: 'admin.wellnex@qmstest.com', ownerPhone: '9800002001',
      divisions: [
        { code: 'wellnex-ortho', name: 'WellNex Orthopedics Division', therapy: ['orthopedics'], headFirst: 'Sameer', headLast: 'Joshi', headEmail: 'divhead.wellnex.ortho@qmstest.com', headPhone: '9800002010' },
      ],
    },
    {
      code: 'curevita', name: 'CureVita Healthcare',
      ownerFirst: 'Farah', ownerLast: 'Sheikh', ownerEmail: 'admin.curevita@qmstest.com', ownerPhone: '9800003001',
      divisions: [
        { code: 'curevita-neuro', name: 'CureVita Neurology Division', therapy: ['neurology'], headFirst: 'Manoj', headLast: 'Pillai', headEmail: 'divhead.curevita.neuro@qmstest.com', headPhone: '9800003010' },
      ],
    },
  ];

  interface SeededDivision { id: string; code: string; headRoleId: string | null; therapy: string[] }
  interface SeededTenant { id: string; code: string; divisions: SeededDivision[] }
  const seededTenants: SeededTenant[] = [];

  for (const t of tenantSeeds) {
    const tenantId = await create(client, `Tenant: ${t.name}`, '/tenants', {
      code: t.code, name: t.name,
      owner: { firstName: t.ownerFirst, lastName: t.ownerLast, email: t.ownerEmail, password: PASSWORD, phone: t.ownerPhone },
    });
    if (!tenantId) continue;
    // The owner (admin) Role's user is force-activated by the backend itself
    // on tenant create (confirmed in tenant.service.ts) — no activation call needed.

    const divisions: SeededDivision[] = [];
    for (const d of t.divisions) {
      const divisionId = await create(client, `Division: ${d.name}`, '/divisions', {
        tenant: tenantId, code: d.code, name: d.name, therapy: d.therapy, mrCount: 1,
        head: { firstName: d.headFirst, lastName: d.headLast, email: d.headEmail, password: PASSWORD, phone: d.headPhone },
      });
      let headRoleId: string | null = null;
      if (divisionId) {
        // The create payload's nested user object is keyed "head"; the
        // RESPONSE field for that same Role is "owner" (populated, with .id,
        // for a division:manage/tenant:admin caller — system:manage qualifies).
        const divRes = await call(client, 'get', `/divisions/${divisionId}`);
        const owner = (divRes.data as any)?.owner;
        headRoleId = typeof owner === 'string' ? owner : owner?.id ?? null;
        await activateUser(await getRoleUserId(headRoleId), `${d.name} head`);
        divisions.push({ id: divisionId, code: d.code, headRoleId, therapy: d.therapy });
      }
    }
    seededTenants.push({ id: tenantId, code: t.code, divisions });
  }
  console.log();

  // ===================== 5. Pharma field force (RSM -> ASM -> MR) per division =====================
  console.log('== Pharma field force (RSM/ASM/MR per division) ==');

  interface FieldForce { rsmId: string | null; asmId: string | null; mrId: string | null }
  const fieldForceByDivision: Record<string, FieldForce> = {};

  for (const tenant of seededTenants) {
    for (const division of tenant.divisions) {
      if (!division.headRoleId) { logSkipped(`Field force for ${division.code}`, 'no division head role'); continue; }

      const rsmTypeId = await getRoleTypeId('pharma-rsm', tenant.id);
      const asmTypeId = await getRoleTypeId('pharma-asm', tenant.id);
      const mrTypeId = await getRoleTypeId('pharma-mr', tenant.id);

      let rsmId: string | null = null;
      let asmId: string | null = null;
      let mrId: string | null = null;

      if (rsmTypeId) {
        rsmId = await create(client, `RSM for ${division.code}`, '/roles', {
          name: `${division.code} RSM`, type: rsmTypeId, tenant: tenant.id, division: division.id, supervisor: division.headRoleId,
          user: { firstName: 'Regional', lastName: `Manager ${division.code}`, email: `rsm.${division.code}@qmstest.com`, password: PASSWORD, phone: '9800009001' },
        });
        await activateUser(await getRoleUserId(rsmId), `RSM for ${division.code}`);
      } else logSkipped(`RSM for ${division.code}`, 'pharma-rsm RoleType not resolved');

      if (asmTypeId && rsmId) {
        asmId = await create(client, `ASM for ${division.code}`, '/roles', {
          name: `${division.code} ASM`, type: asmTypeId, tenant: tenant.id, division: division.id, supervisor: rsmId,
          user: { firstName: 'Area', lastName: `Manager ${division.code}`, email: `asm.${division.code}@qmstest.com`, password: PASSWORD, phone: '9800009002' },
        });
        await activateUser(await getRoleUserId(asmId), `ASM for ${division.code}`);
      } else if (!asmTypeId) logSkipped(`ASM for ${division.code}`, 'pharma-asm RoleType not resolved');

      if (mrTypeId && asmId) {
        mrId = await create(client, `MR for ${division.code}`, '/roles', {
          name: `${division.code} MR`, type: mrTypeId, tenant: tenant.id, division: division.id, supervisor: asmId,
          user: { firstName: 'Medical', lastName: `Rep ${division.code}`, email: `mr.${division.code}@qmstest.com`, password: PASSWORD, phone: '9800009003' },
        });
        await activateUser(await getRoleUserId(mrId), `MR for ${division.code}`);
      } else if (!mrTypeId) logSkipped(`MR for ${division.code}`, 'pharma-mr RoleType not resolved');

      fieldForceByDivision[division.id] = { rsmId, asmId, mrId };
    }
  }
  console.log();

  // ===================== 6. Contacts, Doctors, Leads, Projects per tenant =====================
  console.log('== Contacts, Doctors, Leads, Projects ==');

  interface SeededProject { id: string; tenantId: string; divisionId: string; campTimeSlots: string[] }
  const seededProjects: SeededProject[] = [];
  const doctorIdsByTenant: Record<string, string[]> = {};

  const therapyToProjectType: Record<string, string> = {
    cardiology: 'cardiology', diabetes: 'diabetes', orthopedics: 'orthopedics', neurology: 'neurology',
  };

  for (const tenant of seededTenants) {
    doctorIdsByTenant[tenant.id] = [];
    for (let i = 0; i < 2; i++) {
      const doctorId = await create(client, `Doctor #${i + 1} for ${tenant.code}`, '/doctors', {
        tenant: tenant.id, pharmaCode: `DOC-${tenant.code.toUpperCase()}-0${i + 1}`,
        name: `Dr. ${['Aarav Mehta', 'Sanya Kapoor'][i]}`, specialization: i === 0 ? 'cp' : 'gp',
        mobile: `98700000${i}${tenant.code.length}`, city: 'Gurugram', state: 'Haryana', pincode: '122001',
        email: `dr.${tenant.code}.${i + 1}@qmstest.com`,
      });
      if (doctorId) doctorIdsByTenant[tenant.id].push(doctorId);
    }

    for (const division of tenant.divisions) {
      const contactId = await create(client, `Contact for ${division.code}`, '/contacts', {
        tenant: tenant.id, division: division.id, name: `${division.code} Marketing Contact`,
        designation: 'Marketing Manager', email: `contact.${division.code}@qmstest.com`, phone: '9800005001',
        location: 'Gurugram', type: 'customer',
      });
      if (!contactId) continue;

      const therapy = therapyToProjectType[division.therapy?.[0] as string] ?? 'cardiology';
      // 9-value PROJECT_THERAPY_TYPES is a subset of Division's 13 — fall back
      // to cardiology for any division therapy Project doesn't support.
      const projectTherapy = ['cardiology', 'diabetes', 'pulmonology', 'endocrine', 'orthopedics', 'gynaecology', 'neurology', 'hepatology', 'nephrology'].includes(therapy)
        ? therapy : 'cardiology';

      const leadId = await create(client, `Lead for ${division.code}`, '/leads', {
        tenant: tenant.id, division: division.id, contactPerson: contactId,
        salesPerson: salesRepId || undefined,
        title: `${division.code} Screening Camp Program`,
        problemStatement: 'Client wants recurring screening camps to identify undiagnosed patients in their patient base.',
        numberOfMRS: 1, projectType: 'screening',
      });
      if (!leadId) continue;

      const ff = fieldForceByDivision[division.id];
      const campTimeSlots = ['9am-1pm', '6pm-10pm'];
      const projectId = await create(client, `Project for ${division.code}`, '/projects', {
        lead: leadId, name: `${division.code} Screening Project`, therapy: projectTherapy, type: ['screening_camp'],
        campTimeSlots, campCost: 5000, totalCamps: 10,
        salesRep: salesRepId || undefined, projectCoordinator: coordinatorId || undefined, marketingContact: contactId,
        paymentTerms: 'net_30',
      });
      if (projectId) seededProjects.push({ id: projectId, tenantId: tenant.id, divisionId: division.id, campTimeSlots });
    }
  }
  console.log();

  // ===================== 7. Camps — several per project, at different lifecycle stages =====================
  console.log('== Camps (spread across lifecycle stages) ==');

  interface SeededCamp { id: string; status: string; tenantId: string; projectId: string }
  const seededCamps: SeededCamp[] = [];

  const campLocations = [
    { city: 'Gurugram', state: 'Haryana', pincode: '122001', addressLine1: 'DLF Phase 2 Community Hall', coordinates: [77.0966, 28.4817] as [number, number] },
    { city: 'Mumbai', state: 'Maharashtra', pincode: '400050', addressLine1: 'Bandra Community Centre', coordinates: [72.8296, 19.0596] as [number, number] },
  ];

  // date+timeSlot pairs deliberately reused across camps in the SAME location
  // to exercise the FO double-booking / availability logic realistically.
  const futureDate = (daysFromNow: number) => {
    const d = new Date('2026-10-01T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  };

  for (let projectIndex = 0; projectIndex < seededProjects.length; projectIndex++) {
    const project = seededProjects[projectIndex];
    const doctors = doctorIdsByTenant[project.tenantId];
    const ff = fieldForceByDivision[project.divisionId];
    if (!doctors?.length || !ff?.mrId) { logSkipped(`Camps for project ${project.id}`, 'missing doctor or MR'); continue; }

    // 3 camps per project: one driven to 'live' (screenings/tests), one
    // driven all the way to 'closed' (invoicing), one left 'requested'
    // (so the pipeline/list views show a realistic status mix).
    //
    // Only 2 FO GeoProfiles exist (Gurugram, Mumbai), and campLocations
    // cycles the same 2 cities across every project — so two projects in the
    // same city on the same date+slot would otherwise both try to
    // auto-allocate the SAME single nearby FO. The backend's own
    // availability check (confirmed: exact date+timeSlot, not just date)
    // correctly excludes an already-booked FO, so the second project's camp
    // would then have nobody left to allocate. Stagger dayOffset by
    // projectIndex so same-city projects never collide on date+slot.
    const dayShift = projectIndex * 2;
    const plans: { label: string; targetStatus: 'requested' | 'live' | 'closed'; dayOffset: number; slot: string }[] = [
      { label: 'requested', targetStatus: 'requested', dayOffset: 5 + dayShift, slot: '9am-1pm' },
      { label: 'live', targetStatus: 'live', dayOffset: 2 + dayShift, slot: '10am-2pm' },
      { label: 'closed', targetStatus: 'closed', dayOffset: -3 - dayShift, slot: '11am-3pm' },
    ];

    const location = campLocations[projectIndex % campLocations.length];

    for (const plan of plans) {
      const campId = await create(client, `Camp (${plan.label}) for project ${project.id}`, '/camps', {
        tenant: project.tenantId, division: project.divisionId, project: project.id,
        doctor: doctors[0], mr: ff.mrId, type: 'screening', billingType: 'billable', patientExpectation: 30,
        date: futureDate(plan.dayOffset), timeSlot: plan.slot,
        location: { addressLine1: location.addressLine1, city: location.city, state: location.state, pincode: location.pincode, country: 'India', coordinates: location.coordinates },
        notes: `Seeded camp — target status: ${plan.targetStatus}`,
      });
      if (!campId) continue;

      let currentStatus = 'requested';
      const transitions: { to: string; reason: string }[] = [];
      if (plan.targetStatus === 'live' || plan.targetStatus === 'closed') transitions.push({ to: 'confirmed', reason: 'Seed data — confirming camp' });
      if (plan.targetStatus === 'live' || plan.targetStatus === 'closed') transitions.push({ to: 'live', reason: 'Seed data — camp is live' });
      if (plan.targetStatus === 'closed') transitions.push({ to: 'closed', reason: 'Seed data — closing camp' });

      for (const t of transitions) {
        const res = await call(client, 'patch', `/camps/${campId}/stage`, { to: t.to, reason: t.reason });
        if (res.ok) { currentStatus = t.to; logCreated(`Camp ${campId} -> ${t.to}`); }
        else { logFailed(`Camp ${campId} -> ${t.to}`, `HTTP ${res.status} — ${res.error}`); break; }
      }
      seededCamps.push({ id: campId, status: currentStatus, tenantId: project.tenantId, projectId: project.id });
    }
  }
  console.log();

  // ===================== 8. Patients + Screenings + Tests on 'live' camps =====================
  console.log('== Patients, Screenings, Tests ==');

  const liveCamps = seededCamps.filter((c) => c.status === 'live' || c.status === 'closed');
  const patientSeeds = [
    { firstName: 'Rakesh', lastName: 'Yadav', gender: 'male', mobile: '9811100001', dob: '1980-04-12' },
    { firstName: 'Sunita', lastName: 'Devi', gender: 'female', mobile: '9811100002', dob: '1975-09-23' },
    { firstName: 'Imran', lastName: 'Khan', gender: 'male', mobile: '9811100003', dob: '1990-01-05' },
  ];

  for (const camp of liveCamps) {
    for (const p of patientSeeds) {
      const patientId = await create(client, `Patient ${p.firstName} ${p.lastName} (camp ${camp.id})`, '/patients', {
        firstName: p.firstName, lastName: p.lastName, gender: p.gender, mobile: p.mobile, dateOfBirth: p.dob,
      });
      if (!patientId) continue;

      // Screening requires the camp to be genuinely 'live' at call time — a
      // camp we already advanced to 'closed' can no longer accept one.
      if (camp.status !== 'live') { logSkipped(`Screening for patient ${patientId}`, 'camp already closed'); continue; }

      const screeningId = await create(client, `Screening for ${p.firstName} ${p.lastName}`, '/screenings', {
        patient: patientId, camp: camp.id, symptoms: ['fatigue', 'occasional dizziness'], referral: false,
      });
      if (!screeningId) continue;

      // A Test can only be recorded once its Screening reaches 'completed',
      // which itself requires consent.verified === true. Consent is verified
      // via POST /screenings/:id/verify-consent + the real OTP — but the OTP
      // is generated server-side and genuinely never returned by any API
      // response (confirmed: absent from screening.mapper.ts, by design —
      // it's meant to reach the patient by SMS). SMS/OTP delivery isn't wired
      // in yet, so there is currently no legitimate way to learn the OTP and
      // complete this flow through the real API. Skip Test creation entirely
      // rather than fake a bypass; screenings stay 'pending', which is
      // itself a real, valid state worth having represented in seed data.
      logSkipped(`Test for screening ${screeningId}`, "consent OTP delivery (SMS) isn't wired in yet — screening stays 'pending'");
    }
  }
  console.log();

  // ===================== 9. Invoices on 'closed' camps =====================
  console.log('== Invoices ==');

  const closedCampsByProject = new Map<string, string[]>();
  for (const c of seededCamps) {
    if (c.status !== 'closed') continue;
    const list = closedCampsByProject.get(c.projectId) ?? [];
    list.push(c.id);
    closedCampsByProject.set(c.projectId, list);
  }
  for (const [projectId, campIds] of closedCampsByProject) {
    await create(client, `Invoice for project ${projectId}`, '/invoices', { project: projectId, camps: campIds });
  }
  console.log();

  // ===================== 10. Inventory assignment + request (drives ledger rows naturally) =====================
  console.log('== Inventory assignments/requests (populates the ledger naturally) ==');

  if (deviceId && foRoleIds[0]) {
    await create(client, 'Inventory assignment (BP monitor -> FO)', '/inventory-assignments', {
      assignee: foRoleIds[0], inventoryType: 'InventoryDevice', inventory: deviceId,
    });
  } else logSkipped('Inventory assignment', 'missing device or FO role');

  if (inventoryConsumableMaster2Id) {
    // type 'refill' only accepts InventoryMaster catalog-item lines (not a
    // specific device/consumable batch) — confirmed via
    // ALLOWED_ITEM_TYPES_BY_REQUEST_TYPE.
    const requestId = await create(client, 'Inventory request (Lancets refill)', '/inventory-requests', {
      type: 'refill',
      lineItems: [{ itemType: 'InventoryMaster', item: inventoryConsumableMaster2Id, quantity: 50 }],
    });
    if (requestId) {
      const approveRes = await call(client, 'patch', `/inventory-requests/${requestId}/stage`, { to: 'approved', reason: 'Seed data — approving restock request' });
      if (approveRes.ok) logCreated(`Inventory request ${requestId} -> approved`);
      else logSkipped(`Advance inventory request ${requestId}`, `HTTP ${approveRes.status} — ${approveRes.error} (ledger will still show whatever transitions DID succeed)`);
    }
  }
  console.log();

  // ===================== 11. Appointments + Brands (independent) =====================
  console.log('== Appointments, Brands ==');

  // tenant is NOT accepted on Brand create — derived from division.
  for (const tenant of seededTenants) {
    for (const division of tenant.divisions) {
      await create(client, `Brand for ${division.code}`, '/brands', {
        division: division.id, name: `${division.code} Flagship Brand`,
      });
    }
  }

  const firstTenant = seededTenants[0];
  const firstDivision = firstTenant?.divisions[0];
  if (firstDivision) {
    const contactRes = await call(client, 'get', `/contacts?division=${firstDivision.id}&limit=1`);
    const contactId = (contactRes.data as any)?.items?.[0]?.id;
    if (contactId) {
      // No title/date fields exist — startTime/endTime are full coerced
      // dates, salesPerson is auto-set to the creator, type is a real enum.
      await create(client, 'Appointment (follow-up call)', '/appointments', {
        tenant: firstTenant.id, division: firstDivision.id, contactPerson: contactId,
        type: 'follow-up', mode: 'call',
        startTime: `${futureDate(7)}T11:00:00.000Z`, endTime: `${futureDate(7)}T11:30:00.000Z`,
        agenda: { public: 'Quarterly review call' },
      });
    }
  }
  console.log();

  // ===================== Skipped-by-design modules =====================
  logSkipped('QA Feedback', 'requires a live Jira integration (no local Jira credentials) — not seeded');
  logSkipped('Inventory Ledger direct seeding', 'no create endpoint exists; populated naturally by the inventory request transition above, if it succeeded');
  console.log();

  // ===================== Summary =====================
  console.log('\n========== SEED SUMMARY ==========');
  console.log(`Created: ${created.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed:  ${failed.length}`);
  if (failed.length) {
    console.log('\n--- Failures ---');
    failed.forEach((f) => console.log(`  - ${f}`));
  }
  if (skipped.length) {
    console.log('\n--- Skipped ---');
    skipped.forEach((s) => console.log(`  - ${s}`));
  }

  console.log('\n========== TESTER LOGIN CREDENTIALS (all password: Test@123) ==========');
  console.log('Platform staff:');
  console.log('  sales.priya@qmstest.com          — Sales Rep');
  console.log('  saleshead.arjun@qmstest.com       — Sales Head');
  console.log('  coordinator.neha@qmstest.com      — Camp Coordinator');
  console.log('  opsmanager.rohit@qmstest.com      — Operations Manager');
  console.log('  inventory.sana@qmstest.com        — Inventory Manager');
  console.log('  finance.vikas@qmstest.com         — Finance Manager');
  console.log('  fo.amit@qmstest.com               — Field Officer (Gurugram)');
  console.log('  fo.kavita@qmstest.com             — Field Officer (Mumbai)');
  console.log('\nCustomer tenant admins:');
  for (const t of tenantSeeds) console.log(`  ${t.ownerEmail.padEnd(35)} — ${t.name} (admin)`);
  console.log('\nPharma field force (per division — see script output above for exact emails):');
  console.log('  rsm.<division-code>@qmstest.com, asm.<division-code>@qmstest.com, mr.<division-code>@qmstest.com');
  console.log('  Division codes: ' + tenantSeeds.flatMap((t) => t.divisions.map((d) => d.code)).join(', '));
  console.log('\n(system@gmail.com / Test@123 already exists — bypasses all permission checks, use for anything else.)');
}

main().catch((err) => {
  console.error('\nFATAL — seed script crashed:', err);
  process.exit(1);
});
