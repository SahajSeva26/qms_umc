import { useState } from 'react'
import { useDivisionsShared } from '@/hooks/useDivisionsShared'
import type { SessionResponse } from '@/types/accessManagement.types'

// "Populate a client-side picker with effectively-all options" convention, matching
// UsersPage.tsx's own CLIENT_SIDE_FETCH_LIMIT — the backend's shared default page size (10) would
// otherwise silently hide any tenant's 11th+ division from this picker.
const CLIENT_SIDE_FETCH_LIMIT = 200

interface UseDoctorCreateScopeArgs {
  isEdit: boolean
  session: SessionResponse | null
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string }
}

// Single source of truth for tenant/division scope resolution in EditDoctorModal — owns the
// picker state, the divisions query (with its loading/error/retry), and the resolution priority
// (forced > customer-session > platform-picked). Called ONCE in EditDoctorModal and passed down
// to DoctorSingleForm/DoctorCsvImport (and each one's own <DoctorScopeFields>) so both modes
// share one state instead of drifting.
export function useDoctorCreateScope({ isEdit, session, forcedTenant, forcedDivision }: UseDoctorCreateScopeArgs) {
  const [tenantId, setTenantIdState] = useState('')
  const [tenantLabel, setTenantLabel] = useState('')
  const [divisionId, setDivisionId] = useState('')

  // A platform caller has no single "home" tenant and must pick one; a
  // customer caller's submitted tenant is ignored server-side either way.
  const needsTenantPicker = !isEdit && !forcedTenant && session?.tenant?.type === 'platform'
  // A customer-tenant actor's own division is sourced from session regardless of whether their
  // tenant is separately forced (e.g. BookCampForm's pharma booking flow) — forcedTenant only
  // ever affects which company the create targets, never which actor is doing the creating.
  const isCustomerActor = !isEdit && session?.tenant?.type === 'customer'
  const sessionDivisionId = session?.role?.division ?? null

  // A platform actor picks their own division whenever forcedDivision isn't already supplying
  // one — this applies whether the tenant itself is forced (e.g. a camp already locked to one
  // company but with no project/division picked yet) or picked via the tenant picker above.
  // Never shown for a customer actor (sourced from session instead, read-only) or once
  // forcedDivision is set (skips this picker entirely).
  const needsDivisionPicker = !isEdit && !forcedDivision && session?.tenant?.type === 'platform'
  const effectiveTenantIdForDivisions = forcedTenant ? forcedTenant.id : needsTenantPicker ? tenantId : ''

  const {
    data: divisionsData,
    isLoading: divisionsLoading,
    isError: divisionsErrored,
    refetch: refetchDivisions,
  } = useDivisionsShared(
    { tenant: effectiveTenantIdForDivisions || undefined, limit: String(CLIENT_SIDE_FETCH_LIMIT) },
    needsDivisionPicker && !!effectiveTenantIdForDivisions,
  )
  const divisions = divisionsData?.data?.items ?? []

  // Picking a new tenant invalidates any previously-picked division under the old one.
  const setTenantId = (id: string, label: string) => {
    setTenantIdState(id)
    setTenantLabel(label)
    setDivisionId('')
  }

  // Resolves which division id a bulk/single create should submit, or null if one is still
  // needed but not yet available. Single source of truth: exactly one of these paths is ever
  // active — forced > customer-session > platform-picked.
  const resolveDivisionId = (): string | null => {
    if (forcedDivision) return forcedDivision.id
    if (isCustomerActor) return sessionDivisionId
    return divisionId || null
  }

  const resolveTenantId = (): string | undefined =>
    forcedTenant ? forcedTenant.id : needsTenantPicker ? tenantId : undefined

  return {
    needsTenantPicker,
    needsDivisionPicker,
    isCustomerActor,
    sessionDivisionId,
    tenantId,
    tenantLabel,
    divisionId,
    divisions,
    divisionsLoading,
    divisionsErrored,
    effectiveTenantIdForDivisions,
    setTenantId,
    setDivisionId,
    refetchDivisions,
    resolveDivisionId,
    resolveTenantId,
  }
}

export type DoctorCreateScope = ReturnType<typeof useDoctorCreateScope>
