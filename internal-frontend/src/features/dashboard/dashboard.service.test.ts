import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

const ALL_FLAGS_OFF = {
  canViewProjectReport: false,
  canViewLeadReport: false,
  canViewAppointmentReport: false,
  canViewInventoryAssignmentReport: false,
  canViewInvoiceReport: false,
  canSearchPatients: false,
}

// The default (non-special-cased) response for any URL — matches the generic {count, items}
// paginated shape EXCEPT /leads/report and /appointments/report, which have their own real
// {summary, kpis/byType, ...} shapes and would otherwise crash loadSales reading fields off an
// undefined summary/byType.
function defaultResponseFor(url: string) {
  if (url === '/leads/report') {
    return {
      data: {
        success: true,
        message: '',
        data: {
          summary: { totalLeads: 0, converted: 0, lost: 0, open: 0 },
          kpis: { pipelineValue: 0, wonValue: 0, wonCount: 0, avgDealSize: 0, winRate: 0, salesVelocityDays: 0, topRep: null },
          byStatus: [],
          byProjectType: [],
          trends: { newLeads: { from: '', to: '', data: [] } },
        },
      },
    }
  }
  if (url === '/appointments/report') {
    return {
      data: {
        success: true,
        message: '',
        data: { summary: { total: 0, planned: 0, done: 0, cancelled: 0 }, byStatus: [], byType: [] },
      },
    }
  }
  return { data: { success: true, message: '', data: { count: 0, items: [] } } }
}

describe('dashboard.service.getDashboardData', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns a real, exact count for a clean 200 (company total)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/tenants') return { data: { success: true, message: '', data: { count: 7, items: [] } } }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    expect(result.company.totalCompanies.v).toBe(7)
    expect(result.hasLoadError).toBe(false)
  })

  it('scopes the Company-wise count and breakdown sweep to customer tenants, excluding the platform tenant', async () => {
    const api = (await import('@/lib/api/api')).default
    const tenantCalls: unknown[] = []
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === '/tenants') {
        tenantCalls.push(config?.params)
        return { data: { success: true, message: '', data: { count: 3, items: [] } } }
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    await getDashboardData(ALL_FLAGS_OFF)

    expect(tenantCalls.length).toBeGreaterThan(0)
    for (const params of tenantCalls) {
      expect((params as { type?: string } | undefined)?.type).toBe('customer')
    }
  })

  it('derives totalCompanies from the report=true sweep\'s own count — no separate limit=1 count request', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/tenants') return { data: { success: true, message: '', data: { count: 9, items: [] } } }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    const tenantCallCount = vi.mocked(api.get).mock.calls.filter(([url]) => url === '/tenants').length
    expect(tenantCallCount).toBe(1)
    expect(result.company.totalCompanies.v).toBe(9)
  })

  it('renders "-" (null) for a field whose request throws, and flags hasLoadError, without crashing the rest of the payload', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/doctors') throw new Error('network error')
      if (url === '/tenants') return { data: { success: true, message: '', data: { count: 3, items: [] } } }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    expect(result.doctors.total.v).toBeNull()
    expect(result.hasLoadError).toBe(true)
    // A sibling field's successful fetch is unaffected by doctors' failure.
    expect(result.company.totalCompanies.v).toBe(3)
  })

  it('never substitutes a static/mock number — every field with no real response is null, not a fabricated fallback', async () => {
    const api = (await import('@/lib/api/api')).default
    // Every call fails — simulates an entirely unreachable backend.
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData({ ...ALL_FLAGS_OFF, canSearchPatients: true })

    const allKpiValues = [
      result.company.totalCompanies, result.company.totalDivisions, result.company.totalBilling,
      result.project.totalProjects, result.project.screeningProjects, result.project.dietProjects, result.project.labProjects,
      result.sales.totalLeads, result.sales.pipelineValue, result.sales.leadWinRate, result.sales.followUpAppointments,
      result.fo.activeFOs,
      result.doctors.total,
      result.patients.total,
      result.patients.male, result.patients.female, result.patients.other,
      result.accounts.revenue, result.accounts.arOutstanding, result.accounts.ebita,
    ]
    for (const kpi of allKpiValues) {
      expect(kpi.v).toBeNull()
    }
    expect(result.company.breakdown).toEqual([])
    expect(result.project.statusMix).toEqual([])
    expect(result.hasLoadError).toBe(true)
  })

  it('never requests the gated project/appointment/inventory-assignment/invoice reports when the caller lacks permission', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => defaultResponseFor(url))

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    const calledUrls = vi.mocked(api.get).mock.calls.map(([url]) => url)
    expect(calledUrls).not.toContain('/projects/report')
    expect(calledUrls).not.toContain('/leads/report')
    expect(calledUrls).not.toContain('/appointments/report')
    expect(calledUrls).not.toContain('/inventory-assignments/report')
    expect(calledUrls).not.toContain('/invoices/report')
    expect(result.accounts.totalInvoices.v).toBeNull()
  })

  it('does request the gated reports when the caller holds permission, and wires their real values', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/report') {
        return { data: { success: true, message: '', data: { summary: { totalProjects: 5 }, byStatus: [{ status: 'live', count: 5 }], byTherapy: [] } } }
      }
      if (url === '/leads/report') {
        return {
          data: {
            success: true,
            message: '',
            data: {
              summary: { totalLeads: 11, converted: 3, lost: 1, open: 7 },
              kpis: { pipelineValue: 500000, wonValue: 0, wonCount: 3, avgDealSize: 0, winRate: 75, salesVelocityDays: 0, topRep: null },
              byStatus: [],
              byProjectType: [],
              trends: { newLeads: { from: '', to: '', data: [] } },
            },
          },
        }
      }
      if (url === '/appointments/report') {
        return { data: { success: true, message: '', data: { summary: { total: 2, planned: 2, done: 0, cancelled: 0 }, byStatus: [], byType: [{ type: 'follow-up', count: 2 }] } } }
      }
      if (url === '/inventory-assignments/report') {
        return { data: { success: true, message: '', data: { summary: { totalFieldOfficers: 9, fieldOfficersHoldingInventory: 4 }, fieldOfficers: [] } } }
      }
      if (url === '/invoices/report') {
        return {
          data: {
            success: true,
            message: '',
            data: { totalInvoices: 20, totalInvoiced: 1000000, statusCounts: [{ status: 'paid', count: 15, total: 800000 }] },
          },
        }
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData({
      canViewProjectReport: true,
      canViewLeadReport: true,
      canViewAppointmentReport: true,
      canViewInventoryAssignmentReport: true,
      canViewInvoiceReport: true,
      canSearchPatients: false,
    })

    expect(result.project.statusMix).toEqual([{ status: 'live', count: 5 }])
    expect(result.sales.followUpAppointments.v).toBe(2)
    expect(result.sales.totalLeads.v).toBe(11)
    expect(result.sales.pipelineValue.v).toBe(500000)
    expect(result.sales.leadWinRate.v).toBe(75)
    // Must read summary.totalFieldOfficers (9), never fieldOfficersHoldingInventory (4) — a
    // materially different, smaller number (FOs with zero assigned stock are still "active").
    expect(result.fo.activeFOs.v).toBe(9)
    // Exact invoice terminology — never folded into revenue/EBITA/AR (those stay null, see below).
    expect(result.accounts.totalInvoices.v).toBe(20)
    expect(result.accounts.totalInvoicedAmount.v).toBe(1000000)
    expect(result.accounts.invoiceStatusMix).toEqual([{ status: 'paid', count: 15, total: 800000 }])
    expect(result.accounts.revenue.v).toBeNull()
    expect(result.accounts.arOutstanding.v).toBeNull()
  })

  it('falls back to GET /leads?limit=1 for an exact scoped total when the caller lacks lead:manage, leaving pipelineValue/leadWinRate "-" (never 403ing on /leads/report)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/leads') return { data: { success: true, message: '', data: { count: 4, items: [] } } }
      if (url === '/leads/report') throw new Error('should never be called — would 403 for a lead:search-only caller')
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData({ ...ALL_FLAGS_OFF, canViewLeadReport: false })

    const calledUrls = vi.mocked(api.get).mock.calls.map(([url]) => url)
    expect(calledUrls).toContain('/leads')
    expect(calledUrls).not.toContain('/leads/report')
    expect(result.sales.totalLeads.v).toBe(4)
    expect(result.sales.pipelineValue.v).toBeNull()
    expect(result.sales.leadWinRate.v).toBeNull()
  })

  it('preserves "-" for one gender whose own request failed, instead of treating it as zero', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { gender?: string } }) => {
      if (url === '/patients' && config?.params?.gender === 'female') throw new Error('network error')
      if (url === '/patients' && config?.params?.gender === 'male') return { data: { success: true, message: '', data: { count: 6, items: [] } } }
      if (url === '/patients' && config?.params?.gender === 'other') return { data: { success: true, message: '', data: { count: 1, items: [] } } }
      if (url === '/patients') return { data: { success: true, message: '', data: { count: 10, items: [] } } }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData({ ...ALL_FLAGS_OFF, canSearchPatients: true })

    expect(result.patients.total.v).toBe(10)
    expect(result.patients.male.v).toBe(6)
    expect(result.patients.other.v).toBe(1)
    // The failed gender stays null ("-"), not 0 — a 0 would falsely claim "confirmed zero".
    expect(result.patients.female.v).toBeNull()
    expect(result.hasLoadError).toBe(true)
  })

  it('never requests /patients when the caller lacks patient:search/patient:manage (the Dashboard route only guarantees tenant:manage)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/patients') throw new Error('should never be called — would 403 for a caller without patient:search/manage')
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData({ ...ALL_FLAGS_OFF, canSearchPatients: false })

    const calledUrls = vi.mocked(api.get).mock.calls.map(([url]) => url)
    expect(calledUrls).not.toContain('/patients')
    expect(result.patients.total.v).toBeNull()
    expect(result.patients.male.v).toBeNull()
    expect(result.patients.female.v).toBeNull()
    expect(result.patients.other.v).toBeNull()
  })

  it('builds the doctor specialty breakdown from 12 parallel per-specialty counts, dropping only the one that failed', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { specialization?: string } }) => {
      if (url === '/doctors' && config?.params?.specialization === 'cardiologist') throw new Error('network error')
      if (url === '/doctors' && config?.params?.specialization === 'gp') return { data: { success: true, message: '', data: { count: 5, items: [] } } }
      if (url === '/doctors') return { data: { success: true, message: '', data: { count: 40, items: [] } } }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    expect(result.doctors.total.v).toBe(40)
    const gpRow = result.doctors.bySpecialty.find((r) => r.specialty === 'GP')
    expect(gpRow?.count).toBe(5)
    // The failed specialty is dropped from the list, not shown as a fabricated 0 count.
    expect(result.doctors.bySpecialty.find((r) => r.specialty === 'Cardiologist')).toBeUndefined()
    expect(result.doctors.bySpecialty.length).toBe(11)
  })

  it('sweeps multiple pages of GET /tenants?report=true to build an exact total across more than one page', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { report?: string; page?: string; limit?: string } }) => {
      if (url === '/tenants' && config?.params?.report === 'true') {
        const page = config.params.page
        if (page === '1') {
          return {
            data: {
              success: true,
              message: '',
              data: { count: 25, items: Array.from({ length: 20 }, (_, i) => ({ id: `p1-${i}`, name: `Co ${i}`, stats: { totalDivisions: 1, billed: 100 } })) },
            },
          }
        }
        return {
          data: {
            success: true,
            message: '',
            data: { count: 25, items: Array.from({ length: 5 }, (_, i) => ({ id: `p2-${i}`, name: `Co2 ${i}`, stats: { totalDivisions: 2, billed: 50 } })) },
          },
        }
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    // 20 tenants * 1 division + 5 tenants * 2 divisions = 30; 20*100 + 5*50 = 2250.
    expect(result.company.totalDivisions.v).toBe(30)
    expect(result.company.totalBilling.v).toBe(2250)
    expect(result.company.breakdown.length).toBe(25)
  })

  it('has no page cap on the company sweep — fetches well past the old 400-tenant limit', async () => {
    const api = (await import('@/lib/api/api')).default
    const TOTAL_TENANTS = 500 // 25 pages of 20 — exceeds the removed MAX_COMPANY_REPORT_PAGES=20 (400) cap
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { report?: string; page?: string } }) => {
      if (url === '/tenants' && config?.params?.report === 'true') {
        const page = Number(config.params.page)
        return {
          data: {
            success: true,
            message: '',
            data: { count: TOTAL_TENANTS, items: Array.from({ length: 20 }, (_, i) => ({ id: `p${page}-${i}`, name: `Co`, stats: { totalDivisions: 1, billed: 1 } })) },
          },
        }
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    expect(result.company.breakdown.length).toBe(TOTAL_TENANTS)
    expect(result.hasLoadError).toBe(false)
  })

  it('requires every company report page to succeed before showing aggregate totals — a partial sweep stays "-"/empty, not a number presented as complete', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { report?: string; page?: string } }) => {
      if (url === '/tenants' && config?.params?.report === 'true') {
        const page = config.params.page
        if (page === '1') {
          return {
            data: {
              success: true,
              message: '',
              data: { count: 25, items: Array.from({ length: 20 }, (_, i) => ({ id: `p1-${i}`, name: `Co ${i}`, stats: { totalDivisions: 1, billed: 100 } })) },
            },
          }
        }
        throw new Error('page 2 failed')
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    const result = await getDashboardData(ALL_FLAGS_OFF)

    // Page 1 alone would give totalDivisions=20/breakdown.length=20 if partially aggregated —
    // must instead stay unpopulated (base/empty) since page 2 failed.
    expect(result.company.totalDivisions.v).toBeNull()
    expect(result.company.totalBilling.v).toBeNull()
    expect(result.company.breakdown).toEqual([])
    expect(result.hasLoadError).toBe(true)
  })

  it('fires the independent lead and appointment-report requests together, not sequentially gated on the project request', async () => {
    const api = (await import('@/lib/api/api')).default
    const callOrder: string[] = []
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      callOrder.push(url)
      if (url === '/projects') {
        // Project's own search call resolves slower than the others — if leads/appointments were
        // incorrectly sequenced to wait on it, callOrder would show them starting only after this.
        await new Promise((resolve) => setTimeout(resolve, 20))
        return { data: { success: true, message: '', data: { count: 1, items: [], report: { total: 1, byType: [] } } } }
      }
      return defaultResponseFor(url)
    })

    const { getDashboardData } = await import('./dashboard.service')
    await getDashboardData({ ...ALL_FLAGS_OFF, canViewLeadReport: true, canViewAppointmentReport: true })

    const projectIndex = callOrder.indexOf('/projects')
    const leadsIndex = callOrder.indexOf('/leads/report')
    const appointmentsIndex = callOrder.indexOf('/appointments/report')
    // Both fire before the slow /projects call resolves — proven by them being issued
    // (present in callOrder) despite /projects' artificial 20ms delay before its own entry
    // would otherwise block a naively-sequenced caller from reaching them.
    expect(leadsIndex).toBeGreaterThanOrEqual(0)
    expect(appointmentsIndex).toBeGreaterThanOrEqual(0)
    expect(projectIndex).toBeGreaterThanOrEqual(0)
  })
})
