import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AxiosError } from 'axios'
import { useOnboardFieldOfficer } from './useOnboardFieldOfficer'
import type { CreateRolePayload } from '@/types/accessManagement.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    createRole: vi.fn(),
    createEmployee: vi.fn(),
    searchRoles: vi.fn(),
    searchEmployees: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const ROLE_PAYLOAD: CreateRolePayload = {
  code: 'fo-ravi',
  name: 'Ravi Kumar',
  type: 'rt-fo',
  tenant: 't-platform',
  user: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', password: 'Password1', phone: '9876543210' },
}

const EMPLOYEE_FIELDS = { type: 'field-officer' as const, doj: '2026-01-01' }

function networkError() {
  const err = new AxiosError('Network Error')
  err.response = undefined
  return err
}

function confirmedRejection() {
  const err = new AxiosError('Bad Request')
  err.response = { status: 400, data: {}, statusText: '', headers: {}, config: {} as never }
  return err
}

function serverError() {
  const err = new AxiosError('Internal Server Error')
  err.response = { status: 500, data: {}, statusText: '', headers: {}, config: {} as never }
  return err
}

describe('useOnboardFieldOfficer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('happy path: Role+User success then Employee success resolves to done', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockResolvedValue({ success: true, message: '', data: { id: 'emp-1' } } as never)

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)
    })

    expect(result.current.state).toEqual({ step: 'done', employeeId: 'emp-1' })
    // Every allowed onboarding actor is platform-tenant-scoped, so POST /employees 400s without
    // this — tenant must come through even on the very first, straight-through call.
    expect(accessManagementService.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'user-1', email: 'ravi@example.com', phone: '9876543210', tenant: 't-platform' }),
    )
  })

  it('Role+User failure never calls Employee create, and surfaces an explicit account-creation-failed error state (not a silent reset to idle)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const rejection = confirmedRejection()
    vi.mocked(accessManagementService.createRole).mockRejectedValue(rejection)

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    expect(accessManagementService.createEmployee).not.toHaveBeenCalled()
    expect(result.current.state).toEqual({ step: 'account-creation-failed', error: rejection })
  })

  it('reset() returns to idle after an account-creation-failed state (e.g. the user closes and reopens the modal)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(confirmedRejection())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('account-creation-failed')

    act(() => {
      result.current.reset()
    })

    expect(result.current.state).toEqual({ step: 'idle' })
  })

  it('Role+User success, Employee 400 (confirmed rejection) → account-created, retry re-calls Employee create only with the same userId', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(confirmedRejection())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })
    expect(result.current.state).toEqual({ step: 'account-created', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })
    expect(accessManagementService.createRole).toHaveBeenCalledTimes(1)

    vi.mocked(accessManagementService.createEmployee).mockResolvedValueOnce({ success: true, message: '', data: { id: 'emp-2' } } as never)
    act(() => {
      result.current.retryEmployee('ravi@example.com', '9876543210', EMPLOYEE_FIELDS)
    })

    await waitFor(() => expect(result.current.state).toEqual({ step: 'done', employeeId: 'emp-2' }))
    // Still just once — retry never re-touches Role/User creation.
    expect(accessManagementService.createRole).toHaveBeenCalledTimes(1)
    expect(accessManagementService.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-1', tenant: 't-platform' }))
  })

  it('Role+User success, Employee network error (ambiguous) → employee-uncertain; existence check finds the record → done without a duplicate POST', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })
    expect(result.current.state).toEqual({ step: 'employee-uncertain', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })

    vi.mocked(accessManagementService.searchEmployees).mockResolvedValueOnce({
      success: true, message: '', data: { count: 1, items: [{ id: 'emp-existing' }] },
    } as never)

    await act(async () => {
      await result.current.checkIfEmployeeExists()
    })

    expect(result.current.state).toEqual({ step: 'done', employeeId: 'emp-existing' })
    expect(accessManagementService.createEmployee).toHaveBeenCalledTimes(1)
    expect(accessManagementService.searchEmployees).toHaveBeenCalledWith({ user: 'user-1', tenant: 't-platform', limit: '1' })
  })

  it('same uncertain path but existence check finds nothing → offers a normal retry (back to account-created)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    vi.mocked(accessManagementService.searchEmployees).mockResolvedValueOnce({
      success: true, message: '', data: { count: 0, items: [] },
    } as never)

    await act(async () => {
      await result.current.checkIfEmployeeExists()
    })

    expect(result.current.state).toEqual({ step: 'account-created', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })
  })

  it('Role+User success, Employee 500 (server error) → employee-uncertain, NOT account-created — a 5xx is ambiguous, not a confirmed rejection', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(serverError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    expect(result.current.state).toEqual({ step: 'employee-uncertain', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })
  })

  it('retryEmployee failing again resolves (does not reject) its returned promise — awaitable, but never an unhandled rejection', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee)
      .mockRejectedValueOnce(confirmedRejection())
      .mockRejectedValueOnce(confirmedRejection())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    // Its own errors are caught internally (state reflects the outcome) — awaiting it must not throw.
    await act(async () => {
      await expect(result.current.retryEmployee('ravi@example.com', '9876543210', EMPLOYEE_FIELDS)).resolves.not.toThrow()
    })

    expect(result.current.state).toEqual({ step: 'account-created', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })
  })

  it('retryEmployee returns the in-flight request as an awaitable promise — it does not resolve until the underlying Employee POST settles, so a caller-side submit guard held across the await stays held for the retry\'s full duration', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(confirmedRejection())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('account-created')

    let resolveRetry!: (v: Awaited<ReturnType<typeof accessManagementService.createEmployee>>) => void
    vi.mocked(accessManagementService.createEmployee).mockImplementationOnce(
      () => new Promise((resolve) => { resolveRetry = resolve }),
    )

    let settled = false
    let retryPromise!: Promise<unknown>
    act(() => {
      retryPromise = Promise.resolve(result.current.retryEmployee('ravi@example.com', '9876543210', EMPLOYEE_FIELDS)).then((v) => {
        settled = true
        return v
      })
    })

    // The underlying POST is still pending — the returned promise must not have settled yet.
    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)

    await act(async () => {
      resolveRetry({ success: true, message: '', data: { id: 'emp-2' } } as never)
      await retryPromise
    })

    expect(settled).toBe(true)
    expect(result.current.state).toEqual({ step: 'done', employeeId: 'emp-2' })
  })

  it('Role+User network error (ambiguous) → account-creation-uncertain, NOT account-creation-failed — the transaction may have committed despite the lost response', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    expect(result.current.state).toEqual({
      step: 'account-creation-uncertain', tenant: 't-platform', code: 'fo-ravi', type: 'rt-fo', email: 'ravi@example.com', employeeFields: EMPLOYEE_FIELDS,
    })
    expect(accessManagementService.createEmployee).not.toHaveBeenCalled()
  })

  it('Role+User 500 (server error) → account-creation-uncertain too, same as a network error — a 5xx is never a confirmed rejection', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(serverError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    expect(result.current.state.step).toBe('account-creation-uncertain')
  })

  it('checkIfAccountExists finding the Role continues straight into Employee creation using its linked user — not just "confirmed, now what"', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('account-creation-uncertain')

    vi.mocked(accessManagementService.searchRoles).mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-1', code: 'fo-ravi', user: { _id: 'user-1', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' } }],
      },
    } as never)
    vi.mocked(accessManagementService.createEmployee).mockResolvedValueOnce({ success: true, message: '', data: { id: 'emp-recovered' } } as never)

    await act(async () => {
      await result.current.checkIfAccountExists()
    })

    expect(result.current.state).toEqual({ step: 'done', employeeId: 'emp-recovered' })
    expect(accessManagementService.searchRoles).toHaveBeenCalledWith({ tenant: 't-platform', code: 'fo-ravi', type: 'rt-fo', limit: '1' })
    expect(accessManagementService.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-1', email: 'ravi@example.com', phone: '9876543210', tenant: 't-platform' }))
    // Never a second Role/User POST — the recovery reused the existing one.
    expect(accessManagementService.createRole).toHaveBeenCalledTimes(1)
  })

  it('a fresher employeeFields argument overrides the snapshot captured at the original failure — the Employee-fields step stays editable while uncertain', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    vi.mocked(accessManagementService.searchRoles).mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-1', code: 'fo-ravi', user: { _id: 'user-1', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' } }],
      },
    } as never)
    vi.mocked(accessManagementService.createEmployee).mockResolvedValueOnce({ success: true, message: '', data: { id: 'emp-recovered' } } as never)

    const updatedFields = { type: 'field-officer' as const, doj: '2026-02-01', salary: 50000 }
    await act(async () => {
      await result.current.checkIfAccountExists(updatedFields)
    })

    expect(accessManagementService.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ doj: '2026-02-01', salary: 50000 }))
  })

  it('a recovered Role whose linked user email does NOT match what was submitted is rejected — never attaches an Employee to a mismatched account', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    // A DIFFERENT role wound up with the same tenant+code+type — its linked user's email doesn't
    // match what this flow actually submitted (ravi@example.com).
    vi.mocked(accessManagementService.searchRoles).mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-other', code: 'fo-ravi', user: { _id: 'user-stranger', firstName: 'Someone', lastName: 'Else', email: 'someone.else@example.com', phone: '1111111111' } }],
      },
    } as never)

    await act(async () => {
      await result.current.checkIfAccountExists()
    })

    expect(result.current.state.step).toBe('account-creation-failed')
    expect(accessManagementService.createEmployee).not.toHaveBeenCalled()
  })

  it('checkIfAccountExists finding nothing falls back to account-creation-failed — a fresh start() retry is then safe', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    vi.mocked(accessManagementService.searchRoles).mockResolvedValueOnce({ success: true, message: '', data: { count: 0, items: [] } } as never)

    await act(async () => {
      await result.current.checkIfAccountExists()
    })

    expect(result.current.state.step).toBe('account-creation-failed')
    expect(accessManagementService.createEmployee).not.toHaveBeenCalled()
  })

  it('checkIfAccountExists itself failing stays account-creation-uncertain, not a blind fallback to failed or a retry', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockRejectedValue(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    vi.mocked(accessManagementService.searchRoles).mockRejectedValueOnce(networkError())

    await act(async () => {
      await result.current.checkIfAccountExists()
    })

    expect(result.current.state).toEqual({
      step: 'account-creation-uncertain', tenant: 't-platform', code: 'fo-ravi', type: 'rt-fo', email: 'ravi@example.com', employeeFields: EMPLOYEE_FIELDS,
    })
    expect(accessManagementService.createEmployee).not.toHaveBeenCalled()
    expect(accessManagementService.createRole).toHaveBeenCalledTimes(1)
  })

  it('the existence check itself failing stays employee-uncertain, offering "Check again" rather than a blind POST retry', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } } as never)
    vi.mocked(accessManagementService.createEmployee).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useOnboardFieldOfficer(), { wrapper: makeWrapper() })

    await act(async () => {
      await expect(result.current.start(ROLE_PAYLOAD, EMPLOYEE_FIELDS)).rejects.toThrow()
    })

    vi.mocked(accessManagementService.searchEmployees).mockRejectedValueOnce(networkError())

    await act(async () => {
      await result.current.checkIfEmployeeExists()
    })

    expect(result.current.state).toEqual({ step: 'employee-uncertain', userId: 'user-1', userLabel: 'Ravi Kumar', tenant: 't-platform' })
    expect(accessManagementService.createEmployee).toHaveBeenCalledTimes(1)
  })
})
