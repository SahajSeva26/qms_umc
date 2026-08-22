import { CLIENTS, DIVISIONS, INVOICES, MRS, PROJECTS } from '@/types/client.mock'

// Read-only shared surface over Client Management's static master data —
// kept as a hook so callers keep the same shape/options/isLoading/error fields.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility
export const useClientsDataShared = (_options?: { enabled?: boolean }) => {
  return {
    clients: CLIENTS,
    divisions: DIVISIONS,
    mrs: MRS,
    projects: PROJECTS,
    invoices: INVOICES,
    doctors: [],
    isLoading: false,
    error: null,
  }
}
