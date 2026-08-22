import { useMemo } from 'react'
import { useCampsShared } from '@/features/camps/hooks/useCampsShared'
import { useCampDoctors } from '@/features/camps/hooks/useCampDoctors'
import { useLeadsData } from '@/features/crm/hooks/useLeadsData'
import { useDashboardDataShared } from '@/features/dashboard/hooks/useDashboardDataShared'
import { CLIENTS, PROJECTS, INVOICES } from '@/types/client.types'
import { PNL_TREND, AR_AGING, FIELD_OFFICERS } from '@/features/analytics/analytics.mock'
import { scopedCamps, scopedInvoices, scopedLeads, scopedProjects } from '@/features/analytics/analytics.utils'
import type { AnalyticsFilters } from '@/features/analytics/analytics.types'

// Clients/projects/invoices are hardcoded (types/client.types) pending a real
// backend reporting module; camps/leads use their real, backend-wired hooks.
export const useAnalyticsData = (filters: AnalyticsFilters) => {
  const { camps, isLoading: campsSharedLoading, error: campsSharedError } = useCampsShared()
  const { doctors, isLoading: campDoctorsLoading, error: campDoctorsError } = useCampDoctors()
  const campsLoading = campsSharedLoading || campDoctorsLoading
  const campsError = campsSharedError || campDoctorsError
  const { leads, isLoading: leadsLoading, error: leadsError } = useLeadsData()
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardDataShared()

  const camps_ = useMemo(() => scopedCamps(camps, filters), [camps, filters])
  const projects_ = useMemo(() => scopedProjects(PROJECTS, filters), [filters])
  const leads_ = useMemo(() => scopedLeads(leads, CLIENTS, filters), [leads, filters])
  const invoices_ = useMemo(() => scopedInvoices(INVOICES, CLIENTS, filters), [filters])

  const isLoading = campsLoading || leadsLoading || dashboardLoading
  const error = campsError || leadsError || dashboardError

  return {
    clients: CLIENTS,
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
