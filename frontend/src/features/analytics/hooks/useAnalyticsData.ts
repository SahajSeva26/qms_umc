import { useMemo } from 'react'
import { useCampsData } from '@/hooks/useCampsData'
import { useClientsDataShared } from '@/hooks/useClientsDataShared'
import { useLeadsData } from '@/hooks/useLeadsData'
import { useSalesDataShared } from '@/hooks/useSalesDataShared'
import { useDashboardDataShared } from '@/hooks/useDashboardDataShared'
import { PNL_TREND, AR_AGING, FIELD_OFFICERS } from '@/features/analytics/analytics.mock'
import { scopedCamps, scopedInvoices, scopedLeads, scopedProjects } from '@/features/analytics/analytics.utils'
import type { AnalyticsFilters } from '@/types/analytics.types'

// Aggregates every module Analytics needs to read — always through the
// shared top-level hooks (never a sibling feature's internal mock/data
// files), then applies the shared period/client scoping so all 6 tabs work
// off the same filtered sets.
export const useAnalyticsData = (filters: AnalyticsFilters) => {
  const { camps, doctors, isLoading: campsLoading, error: campsError } = useCampsData()
  const { clients, projects, invoices, isLoading: clientsLoading, error: clientsError } = useClientsDataShared()
  const { leads, isLoading: leadsLoading, error: leadsError } = useLeadsData()
  const { reps, isLoading: salesLoading, error: salesError } = useSalesDataShared()
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardDataShared()

  const camps_ = useMemo(() => scopedCamps(camps, filters), [camps, filters])
  const projects_ = useMemo(() => scopedProjects(projects, filters), [projects, filters])
  const leads_ = useMemo(() => scopedLeads(leads, clients, filters), [leads, clients, filters])
  const invoices_ = useMemo(() => scopedInvoices(invoices, clients, filters), [invoices, clients, filters])

  const isLoading = campsLoading || clientsLoading || leadsLoading || salesLoading || dashboardLoading
  const error = campsError || clientsError || leadsError || salesError || dashboardError

  return {
    clients,
    reps,
    doctors,
    fieldOfficers: FIELD_OFFICERS,
    pnlTrend: PNL_TREND,
    arAging: AR_AGING,
    expenseSplit: dashboardData?.accounts.expenseSplit ?? [],
    camps: camps_,
    projects: projects_,
    leads: leads_,
    invoices: invoices_,
    isLoading,
    error,
  }
}
