import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'

// Regression test for the real bug fixed 2026-08-15: useCampDoctors.ts's mock
// doctor seed list (split out of the former useCampsData.ts) and
// useDoctors.ts's real backend-wired doctor list used to share the literal
// query key 'doctors', so TanStack's prefix-matching invalidateQueries meant
// every real doctor create/update silently forced an unrelated refetch of the
// unrelated mock list too. This test exercises the ACTUAL production hooks
// (not synthetic stand-ins) to prove the fix holds: doctorKeys.all is
// ['doctors'], useCampDoctors's mock list is keyed ['mockCampDoctors'] — the
// two must never cross-invalidate.
vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ data: { items: [], count: 0 } })),
    createDoctor: vi.fn(async () => ({ data: { id: 'd-1' } })),
  },
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('doctors vs mockCampDoctors cache isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('creating a real doctor does NOT refetch useCampDoctors\'s mock doctor list', async () => {
    const { useCreateDoctor } = await import('@/features/doctors/hooks/useCreateDoctor')
    const { useCampDoctors } = await import('@/features/camps/hooks/useCampDoctors')
    const { doctorsService } = await import('@/features/doctors/doctors.service')

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    const { result: campDoctorsResult } = renderHook(() => useCampDoctors(), { wrapper })
    await waitFor(() => expect(campDoctorsResult.current.isLoading).toBe(false))

    const mockDoctorsQueryFn = queryClient.getQueryCache().find({ queryKey: ['mockCampDoctors'] })?.options.queryFn
    expect(mockDoctorsQueryFn).toBeDefined()
    const mockDoctorsFetchCountBefore = queryClient.getQueryCache().find({ queryKey: ['mockCampDoctors'] })?.state.dataUpdateCount

    const { result: createDoctorResult } = renderHook(() => useCreateDoctor(), { wrapper })
    await act(async () => {
      await createDoctorResult.current.mutateAsync({
        pharmaCode: 'DOC-1', name: 'Dr. Test', specialization: 'cp', mobile: '9999999999',
        city: 'X', state: 'Y', pincode: '123456', email: 'test@example.com',
      })
    })

    expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1)

    // Give any (incorrect) cross-invalidation a chance to fire before asserting it didn't.
    await new Promise((r) => setTimeout(r, 50))
    const mockDoctorsFetchCountAfter = queryClient.getQueryCache().find({ queryKey: ['mockCampDoctors'] })?.state.dataUpdateCount
    expect(mockDoctorsFetchCountAfter).toBe(mockDoctorsFetchCountBefore)
  })

  it('doctorKeys.all is exactly [\'doctors\'] and never collides with the literal \'mockCampDoctors\' key', async () => {
    const { doctorKeys } = await import('@/features/doctors/hooks/useDoctors')
    expect(doctorKeys.all).toEqual(['doctors'])
    expect(doctorKeys.all[0]).not.toBe('mockCampDoctors')
  })
})
