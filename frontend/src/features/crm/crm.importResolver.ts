import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { crmService } from '@/features/crm/crm.service'

// Resolves the human-readable names a CSV row provides (matching Export's own
// column shape — Company/Division/Contact/Sales rep as display names, not
// IDs) back into the real ObjectIds CreateLeadPayload requires. Uses each
// resource's own search endpoint's server-side `name` filter (confirmed
// case-insensitive partial/regex match — tenant.service.ts/role.service.ts/
// division.service.ts all do `{ $regex: escapeRegex(name), $options: 'i' }`)
// rather than fetching every record and filtering client-side — no backend
// changes needed, this is exactly what those endpoints were already built
// to do for the wizard's own pickers.
//
// A name match must be EXACT (case-insensitive) and UNIQUE to resolve
// automatically — a partial/ambiguous match is surfaced as an error rather
// than guessed, since silently picking "the first match" could bind a lead
// to the wrong tenant/division/person.

export interface ResolvedRow {
  tenantId: string
  tenantName: string
  divisionId: string
  divisionName: string
  contactPersonId: string
  contactPersonName: string
  salesPersonId: string
  salesPersonName: string
}

export type ResolveError = { field: string; message: string }

const exactMatch = <T extends { }>(items: T[], nameOf: (item: T) => string, target: string): T | null => {
  const wanted = target.trim().toLowerCase()
  const matches = items.filter((item) => nameOf(item).trim().toLowerCase() === wanted)
  return matches.length === 1 ? matches[0] : null
}

/**
 * Resolves one CSV row's Company/Division/Contact/Sales rep name columns.
 * Returns either the fully-resolved IDs or a list of every field that failed
 * to resolve (so the preview screen can show ALL problems for a row at once,
 * not just the first one hit).
 */
export async function resolveRowNames(row: {
  company: string
  division: string
  contact: string
  salesRep: string
}): Promise<{ resolved: ResolvedRow | null; errors: ResolveError[] }> {
  const errors: ResolveError[] = []

  // 1: Tenant (Company) — searched unscoped, by name.
  const tenantRes = await accessManagementService.searchTenants({ name: row.company, limit: '1000' })
  const tenant = exactMatch(tenantRes.data?.items ?? [], (t) => t.name, row.company)
  if (!tenant) {
    const count = (tenantRes.data?.items ?? []).length
    errors.push({
      field: 'Company',
      message: count > 1
        ? `"${row.company}" matches more than one tenant — use the exact name.`
        : `No tenant found matching "${row.company}".`,
    })
  }

  // 2: Division — scoped to the resolved tenant (division names are only
  // unique within a tenant, matching how the wizard's own Division picker
  // is scoped), so this step is skipped if Company didn't resolve.
  let division: { id: string; name: string } | null = null
  if (tenant) {
    const divisionRes = await crmService.searchDivisions({ tenantId: tenant.id, name: row.division, limit: '1000' })
    division = exactMatch(divisionRes.data?.items ?? [], (d) => d.name, row.division)
    if (!division) {
      const count = (divisionRes.data?.items ?? []).length
      errors.push({
        field: 'Division',
        message: count > 1
          ? `"${row.division}" matches more than one division under "${row.company}".`
          : `No division found matching "${row.division}" under tenant "${row.company}".`,
      })
    }
  }

  // 3: Contact person — a Role under the SAME tenant as Company (mirrors
  // EditLeadModal.tsx's own contactPerson scoping rule: contactPerson.tenant
  // must equal the lead's tenant, enforced server-side in lead.service.ts).
  let contact: { id: string; name: string } | null = null
  if (tenant) {
    const contactRes = await accessManagementService.searchRoles({ tenant: tenant.id, name: row.contact, status: 'active', limit: '1000' })
    contact = exactMatch(contactRes.data?.items ?? [], (r) => r.name, row.contact)
    if (!contact) {
      const count = (contactRes.data?.items ?? []).length
      errors.push({
        field: 'Contact',
        message: count > 1
          ? `"${row.contact}" matches more than one active role under "${row.company}".`
          : `No active role found matching "${row.contact}" under tenant "${row.company}".`,
      })
    }
  }

  // 4: Sales rep — a Role under the PLATFORM tenant specifically (mirrors
  // WizardStep4.tsx's own salesPerson scoping rule), never the pharma
  // client's own tenant, resolved independently of Company/Division.
  const platformTenantRes = await accessManagementService.searchTenants({ limit: '1000' })
  const platformTenant = (platformTenantRes.data?.items ?? []).find((t) => t.type === 'platform')
  let salesRep: { id: string; name: string } | null = null
  if (!platformTenant) {
    errors.push({ field: 'Sales rep', message: 'No platform (QMS internal) tenant found — a sales rep must belong to one.' })
  } else {
    const salesRepRes = await accessManagementService.searchRoles({ tenant: platformTenant.id, name: row.salesRep, status: 'active', limit: '1000' })
    salesRep = exactMatch(salesRepRes.data?.items ?? [], (r) => r.name, row.salesRep)
    if (!salesRep) {
      const count = (salesRepRes.data?.items ?? []).length
      errors.push({
        field: 'Sales rep',
        message: count > 1
          ? `"${row.salesRep}" matches more than one active internal role.`
          : `No active internal (QMS platform) role found matching "${row.salesRep}".`,
      })
    }
  }

  if (errors.length > 0 || !tenant || !division || !contact || !salesRep) {
    return { resolved: null, errors }
  }

  return {
    resolved: {
      tenantId: tenant.id,
      tenantName: tenant.name,
      divisionId: division.id,
      divisionName: division.name,
      contactPersonId: contact.id,
      contactPersonName: contact.name,
      salesPersonId: salesRep.id,
      salesPersonName: salesRep.name,
    },
    errors: [],
  }
}
