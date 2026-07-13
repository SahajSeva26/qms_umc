import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCamps } from '@/features/camps/hooks/useCamps'
import * as campsService from '@/features/camps/camps.service'
import { useClientsData } from '@/features/crm/clients/hooks/useClientsData'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useSalesData } from '@/features/crm/sales/hooks/useSalesData'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { PNL_TREND, AR_AGING, FIELD_OFFICERS } from '@/features/analytics/analytics.mock'
import { scopedCamps, scopedInvoices, scopedLeads, scopedProjects } from '@/features/analytics/analytics.utils'
import type { AnalyticsFilters } from '@/types/analytics.types'

// Aggregates every module Analytics needs to read — always through that
// feature's own public service/hook, never its internal mock/data files —
// then applies the shared period/client scoping so all 6 tabs work off the
// same filtered sets.
export const useAnalyticsData = (filters: AnalyticsFilters) => {
  const { camps, isLoading: campsLoading, error: campsError } = useCamps()
  const { clients, projects, invoices, isLoading: clientsLoading, error: clientsError } = useClientsData()
  const { leads, isLoading: leadsLoading, error: leadsError } = useLeads()
  const { reps, isLoading: salesLoading, error: salesError } = useSalesData()
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData()
  const { data: doctors = [], isLoading: doctorsLoading, error: doctorsError } = useQuery({
    queryKey: ['doctors'],
    queryFn: campsService.getDoctors,
  })

  const camps_ = useMemo(() => scopedCamps(camps, filters), [camps, filters])
  const projects_ = useMemo(() => scopedProjects(projects, filters), [projects, filters])
  const leads_ = useMemo(() => scopedLeads(leads, clients, filters), [leads, clients, filters])
  const invoices_ = useMemo(() => scopedInvoices(invoices, clients, filters), [invoices, clients, filters])

  const isLoading = campsLoading || clientsLoading || leadsLoading || salesLoading || dashboardLoading || doctorsLoading
  const error = campsError || clientsError || leadsError || salesError || dashboardError || doctorsError

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
