import { COMPANY, PROJECT, FO, SALES, ACCOUNTS, DOCTORS, PATIENTS } from '@/features/dashboard/dashboard.mock'

// TODO: replace with real API call once backend endpoints exist
export async function getDashboardData() {
  return Promise.resolve({
    company: COMPANY,
    project: PROJECT,
    fo: FO,
    sales: SALES,
    accounts: ACCOUNTS,
    doctors: DOCTORS,
    patients: PATIENTS,
  })
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>
