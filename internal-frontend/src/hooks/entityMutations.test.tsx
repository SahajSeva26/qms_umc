import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { useCreateEntity } from '@/hooks/useCreateEntity'
import { useUpdateEntity } from '@/hooks/useUpdateEntity'

// Verifies the two invalidation CONVENTIONS documented in entityQueryKeys.ts
// actually hold at runtime for hooks built on the factory: create invalidates
// only the entity root, update invalidates both detail and root. These are
// the load-bearing behaviors the whole 6-batch migration assumed were
// preserved by construction — this is the first automated check of that.
function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateEntity', () => {
  it('invalidates the entity root (keys.all) on success, refetching a mounted list query', async () => {
    const keys = createEntityKeys<{ name?: string }>('widgets', 'widget')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    let listCallCount = 0
    const searchFn = vi.fn(async () => {
      listCallCount += 1
      return { items: [], count: listCallCount }
    })

    const { result: listResult } = renderHook(() => useEntityQuery(keys, searchFn, {}), { wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    expect(listCallCount).toBe(1)

    const createFn = vi.fn(async () => ({ id: 'new-1' }))
    const { result: createResult } = renderHook(() => useCreateEntity(createFn, keys.all), { wrapper })

    await act(async () => {
      await createResult.current.mutateAsync({ name: 'New Widget' })
    })

    // The mounted list query must have refetched as a direct result of the
    // create mutation's invalidateQueries — not just eventually, on its own.
    await waitFor(() => expect(listCallCount).toBe(2))
  })

  it('does NOT invalidate an unrelated entity\'s root', async () => {
    const widgetKeys = createEntityKeys<object>('widgets', 'widget')
    const gadgetKeys = createEntityKeys<object>('gadgets', 'gadget')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    let gadgetListCallCount = 0
    const gadgetSearchFn = vi.fn(async () => {
      gadgetListCallCount += 1
      return { items: [], count: gadgetListCallCount }
    })

    const { result: gadgetListResult } = renderHook(() => useEntityQuery(gadgetKeys, gadgetSearchFn, {}), { wrapper })
    await waitFor(() => expect(gadgetListResult.current.isSuccess).toBe(true))
    expect(gadgetListCallCount).toBe(1)

    const createWidgetFn = vi.fn(async () => ({ id: 'w-1' }))
    const { result: createResult } = renderHook(() => useCreateEntity(createWidgetFn, widgetKeys.all), { wrapper })

    await act(async () => {
      await createResult.current.mutateAsync({})
    })

    // Give any (incorrect) cross-invalidation a chance to fire before asserting it didn't.
    await new Promise((r) => setTimeout(r, 50))
    expect(gadgetListCallCount).toBe(1)
  })
})

describe('useUpdateEntity', () => {
  it('invalidates BOTH keys.detail(id) and keys.all on success', async () => {
    const keys = createEntityKeys<{ name?: string }>('widgets', 'widget')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    let detailCallCount = 0
    let listCallCount = 0
    const getFn = vi.fn(async () => {
      detailCallCount += 1
      return { id: 'w-1', name: `call-${detailCallCount}` }
    })
    const searchFn = vi.fn(async () => {
      listCallCount += 1
      return { items: [], count: listCallCount }
    })

    const { result: detailResult } = renderHook(
      () => useQuery({ queryKey: keys.detail('w-1'), queryFn: getFn }),
      { wrapper },
    )
    const { result: listResult } = renderHook(() => useEntityQuery(keys, searchFn, {}), { wrapper })

    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    expect(detailCallCount).toBe(1)
    expect(listCallCount).toBe(1)

    const updateFn = vi.fn(async () => ({ id: 'w-1', name: 'renamed' }))
    const { result: updateResult } = renderHook(
      () => useUpdateEntity(updateFn, [keys.detail('w-1'), keys.all]),
      { wrapper },
    )

    await act(async () => {
      await updateResult.current.mutateAsync({ name: 'renamed' })
    })

    await waitFor(() => expect(detailCallCount).toBe(2))
    await waitFor(() => expect(listCallCount).toBe(2))
  })

  it('a mutation that changes another entity\'s records invalidates THAT entity, not its own — Division bulk-MR import pattern', async () => {
    // Mirrors useBulkCreateMr.ts's real shape: a mutation that creates
    // Role/User rows, not Division rows, so it invalidates roleKeys.all and
    // must NOT touch divisionKeys at all.
    const roleKeys = createEntityKeys<object>('roles', 'role')
    const divisionKeys = createEntityKeys<object>('divisions', 'division')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    let roleListCallCount = 0
    let divisionListCallCount = 0
    const roleSearchFn = vi.fn(async () => { roleListCallCount += 1; return { items: [], count: roleListCallCount } })
    const divisionSearchFn = vi.fn(async () => { divisionListCallCount += 1; return { items: [], count: divisionListCallCount } })

    const { result: roleListResult } = renderHook(() => useEntityQuery(roleKeys, roleSearchFn, {}), { wrapper })
    const { result: divisionListResult } = renderHook(() => useEntityQuery(divisionKeys, divisionSearchFn, {}), { wrapper })
    await waitFor(() => expect(roleListResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(divisionListResult.current.isSuccess).toBe(true))

    const bulkMrFn = vi.fn(async () => ({ created: 3 }))
    const { result: bulkMrResult } = renderHook(
      () => useUpdateEntity(bulkMrFn, [roleKeys.all]),
      { wrapper },
    )

    await act(async () => {
      await bulkMrResult.current.mutateAsync({})
    })

    await waitFor(() => expect(roleListCallCount).toBe(2))
    await new Promise((r) => setTimeout(r, 50))
    expect(divisionListCallCount).toBe(1)
  })
})
