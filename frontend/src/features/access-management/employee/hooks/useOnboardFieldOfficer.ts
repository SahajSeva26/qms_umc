import { useState } from 'react'
import axios from 'axios'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { useCreateEmployee } from '@/features/access-management/employee/hooks/useCreateEmployee'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { CreateRolePayload, CreateEmployeePayload, RolePopulatedUser } from '@/types/accessManagement.types'

type OnboardState =
  | { step: 'idle' }
  | { step: 'creating-account' }
  // A confirmed 4xx — the request was rejected before any write, so a fresh start() retry is safe.
  | { step: 'account-creation-failed'; error: unknown }
  // A network error/timeout/5xx — the transaction may have committed despite the lost response,
  // so a blind retry could hit a real duplicate-conflict; checkIfAccountExists() resolves this.
  | { step: 'account-creation-uncertain'; tenant: string; type: string; email: string; employeeFields: EmployeeFieldsPayload }
  | { step: 'checking-account'; tenant: string; type: string; email: string; employeeFields: EmployeeFieldsPayload }
  | { step: 'account-created'; userId: string; userLabel: string; tenant: string }
  | { step: 'creating-employee'; userId: string; userLabel: string; tenant: string }
  | { step: 'employee-uncertain'; userId: string; userLabel: string; tenant: string }
  | { step: 'checking-employee'; userId: string; userLabel: string; tenant: string }
  | { step: 'done'; employeeId: string }

// tenant is carried on the onboarding state itself (not just passed per-call) since a
// platform-tenant actor's POST /employees requires it explicitly, and the recovery paths below
// re-enter submitEmployee from state, not from a fresh call site.
type EmployeeFieldsPayload = Omit<CreateEmployeePayload, 'user' | 'email' | 'phone' | 'tenant'>

// Role+User creation is transactional server-side, but the subsequent POST /employees is not — a
// naive "retry everything" would re-submit Role+User too and hit real duplicate-email/user 409s.
export function useOnboardFieldOfficer() {
  const [state, setState] = useState<OnboardState>({ step: 'idle' })
  const createRole = useCreateRole()
  const createEmployee = useCreateEmployee()

  const start = async (rolePayload: CreateRolePayload, employeeFields: EmployeeFieldsPayload) => {
    setState({ step: 'creating-account' })
    let userId: string
    const userLabel = `${rolePayload.user.firstName} ${rolePayload.user.lastName ?? ''}`.trim()

    try {
      const res = await createRole.mutateAsync(rolePayload)
      const user = res.data?.user
      userId = typeof user === 'string' ? user : ''
      if (!userId) throw new Error('Role created but no linked user id was returned')
    } catch (err) {
      // Only a confirmed 4xx is safe to retry fresh — a network error/timeout/5xx is ambiguous
      // (the transaction may have committed despite the lost response), so it's treated as uncertain instead.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      const isConfirmedRejection = status !== undefined && status >= 400 && status < 500
      if (isConfirmedRejection) {
        setState({ step: 'account-creation-failed', error: err })
      } else {
        setState({
          step: 'account-creation-uncertain',
          tenant: rolePayload.tenant,
          type: rolePayload.type,
          email: rolePayload.user.email,
          employeeFields,
        })
      }
      throw err
    }

    setState({ step: 'account-created', userId, userLabel, tenant: rolePayload.tenant })
    await submitEmployee(userId, userLabel, rolePayload.user.email, rolePayload.user.phone, employeeFields, rolePayload.tenant)
  }

  const submitEmployee = async (
    userId: string,
    userLabel: string,
    email: string,
    phone: string | undefined,
    employeeFields: EmployeeFieldsPayload,
    tenant: string,
  ) => {
    setState({ step: 'creating-employee', userId, userLabel, tenant })
    try {
      const res = await createEmployee.mutateAsync({ ...employeeFields, user: userId, email, phone: phone ?? '', tenant })
      setState({ step: 'done', employeeId: res.data!.id })
    } catch (err) {
      // Only a 4xx is safe to treat as "nothing was persisted" — a 5xx may have created the
      // record despite the error response, just as ambiguous as a network error/timeout.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      const isConfirmedRejection = status !== undefined && status >= 400 && status < 500
      if (isConfirmedRejection) {
        setState({ step: 'account-created', userId, userLabel, tenant })
      } else {
        setState({ step: 'employee-uncertain', userId, userLabel, tenant })
      }
      throw err
    }
  }

  // Re-calls POST /employees only, never Role/User creation. Errors are swallowed here (state
  // already reflects the outcome via submitEmployee's own catch), not re-thrown as an unhandled
  // rejection. tenant is read from state, not a fresh argument — this only ever fires from
  // account-created, so the state-held value is the correct and only source.
  // Returns the underlying promise (rather than fire-and-forget) so a caller-side submit guard can
  // await it — otherwise a synchronous submit-lock release races the still-in-flight retry POST.
  const retryEmployee = (email: string, phone: string | undefined, employeeFields: EmployeeFieldsPayload) => {
    if (state.step !== 'account-created') return Promise.resolve()
    return submitEmployee(state.userId, state.userLabel, email, phone, employeeFields, state.tenant).catch(() => {})
  }

  // Searched by email (role code is server-generated, unknown in advance). The backend's `user`
  // filter is fuzzy, not exact — scan all candidates for an exact email match, not just the first.
  const checkIfAccountExists = async (latestEmployeeFields?: EmployeeFieldsPayload) => {
    if (state.step !== 'account-creation-uncertain') return
    const { tenant, type, email, employeeFields: capturedEmployeeFields } = state
    const employeeFields = latestEmployeeFields ?? capturedEmployeeFields
    setState({ step: 'checking-account', tenant, type, email, employeeFields })
    try {
      const res = await accessManagementService.searchRoles({ tenant, user: email, type, limit: '20' })
      const candidates = res.data?.items ?? []
      const matchedRole = candidates.find((role) => {
        const roleUser = typeof role.user === 'string' ? null : (role.user as RolePopulatedUser)
        return roleUser?.email?.toLowerCase() === email.toLowerCase()
      })
      const user = matchedRole ? (matchedRole.user as RolePopulatedUser) : null
      if (matchedRole && user?._id) {
        const userLabel = `${user.firstName} ${user.lastName ?? ''}`.trim()
        setState({ step: 'account-created', userId: user._id, userLabel, tenant })
        await submitEmployee(user._id, userLabel, user.email, user.phone, employeeFields, tenant)
      } else {
        setState({
          step: 'account-creation-failed',
          error: new Error(
            candidates.length > 0
              ? 'A different account was found for this email — nothing was attached. Please retry.'
              : 'No account found for this email — nothing was created.',
          ),
        })
      }
    } catch {
      // A failed check is not proof the account doesn't exist — stay uncertain, don't fall back to a blind retry.
      setState({ step: 'account-creation-uncertain', tenant, type, email, employeeFields })
    }
  }

  const checkIfEmployeeExists = async () => {
    if (state.step !== 'employee-uncertain') return
    const { userId, userLabel, tenant } = state
    setState({ step: 'checking-employee', userId, userLabel, tenant })
    try {
      // tenant is required here too — a platform actor's employee search is otherwise global
      // (contextBuilder.ts's where() returns {} for platform tenants), and an Employee is unique
      // only per {tenant, user}, so an unscoped search could match this user's record in a
      // different tenant and wrongly resolve this flow to done.
      const res = await accessManagementService.searchEmployees({ user: userId, tenant, limit: '1' })
      const existing = res.data?.items[0]
      if (existing) {
        setState({ step: 'done', employeeId: existing.id })
      } else {
        setState({ step: 'account-created', userId, userLabel, tenant })
      }
    } catch {
      // A failed check is not proof the record doesn't exist — stay uncertain, don't fall back to a blind retry.
      setState({ step: 'employee-uncertain', userId, userLabel, tenant })
    }
  }

  const reset = () => setState({ step: 'idle' })

  return { state, start, retryEmployee, checkIfAccountExists, checkIfEmployeeExists, reset }
}
