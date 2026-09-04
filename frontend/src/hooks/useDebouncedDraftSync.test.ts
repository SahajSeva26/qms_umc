import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDebouncedDraftSync } from './useDebouncedDraftSync'

describe('useDebouncedDraftSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not write while inactive', () => {
    const setDraft = vi.fn()
    renderHook(() => useDebouncedDraftSync('v1', false, setDraft))
    vi.advanceTimersByTime(1000)
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('writes once, after the debounce window, once active', () => {
    const setDraft = vi.fn()
    renderHook(() => useDebouncedDraftSync('v1', true, setDraft))
    vi.advanceTimersByTime(399)
    expect(setDraft).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(setDraft).toHaveBeenCalledTimes(1)
    expect(setDraft).toHaveBeenCalledWith('v1')
  })

  it('rapid consecutive value changes produce exactly one write, with the latest value', () => {
    const setDraft = vi.fn()
    const { rerender } = renderHook(({ value }) => useDebouncedDraftSync(value, true, setDraft), {
      initialProps: { value: 'v1' },
    })
    rerender({ value: 'v2' })
    vi.advanceTimersByTime(200)
    rerender({ value: 'v3' })
    vi.advanceTimersByTime(399)
    expect(setDraft).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(setDraft).toHaveBeenCalledTimes(1)
    expect(setDraft).toHaveBeenCalledWith('v3')
  })

  it('flushes the latest value synchronously on unmount while genuinely active', () => {
    const setDraft = vi.fn()
    const { unmount } = renderHook(() => useDebouncedDraftSync('v1', true, setDraft))
    // Unmount before the debounce timer would have fired.
    unmount()
    expect(setDraft).toHaveBeenCalledTimes(1)
    expect(setDraft).toHaveBeenCalledWith('v1')
  })

  it('does NOT flush on unmount when never active at any point', () => {
    const setDraft = vi.fn()
    const { unmount } = renderHook(() => useDebouncedDraftSync('v1', false, setDraft))
    unmount()
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('DOES flush on unmount once active flips true after the first render — the closure-bug regression', () => {
    const setDraft = vi.fn()
    const { rerender, unmount } = renderHook(({ active }) => useDebouncedDraftSync('v1', active, setDraft), {
      initialProps: { active: false },
    })
    // Flips active AFTER the first render — a []-deps unmount cleanup that
    // captured the stale initial `false` would never see this change, and
    // would wrongly skip the flush below.
    rerender({ active: true })
    unmount()
    expect(setDraft).toHaveBeenCalledTimes(1)
  })

  it('a form that starts inactive and only becomes active partway through still flushes correctly on unmount', () => {
    const setDraft = vi.fn()
    const { rerender, unmount } = renderHook(({ value, active }) => useDebouncedDraftSync(value, active, setDraft), {
      initialProps: { value: 'initial', active: false },
    })
    rerender({ value: 'edited', active: true })
    unmount()
    expect(setDraft).toHaveBeenCalledTimes(1)
    expect(setDraft).toHaveBeenCalledWith('edited')
  })

  it('calling the returned stop() before unmount means the unmount flush does NOT fire', () => {
    const setDraft = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedDraftSync('v1', true, setDraft))
    result.current()
    unmount()
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('calling stop() BEFORE the debounce timer fires means that pending write never happens', () => {
    const setDraft = vi.fn()
    const { result } = renderHook(() => useDebouncedDraftSync('v1', true, setDraft))
    // Stop partway through the debounce window, before the 400ms timer fires.
    vi.advanceTimersByTime(100)
    result.current()
    vi.advanceTimersByTime(1000)
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('a render that changes value and unmounts before passive effects can run still flushes the FINAL value — the useLayoutEffect regression', () => {
    // Passive (useEffect) ref-mirroring runs asynchronously after commit; a
    // synchronous rerender()-then-unmount() in the same tick, with no await
    // in between, can skip that passive effect entirely and go straight to
    // the unmount cleanup. Only a LAYOUT effect is guaranteed to have
    // mirrored the new value by the time that cleanup runs.
    const setDraft = vi.fn()
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedDraftSync(value, true, setDraft), {
      initialProps: { value: 'first' },
    })
    rerender({ value: 'final-keystroke' })
    unmount() // no await/yield between rerender and unmount
    expect(setDraft).toHaveBeenCalledTimes(1)
    expect(setDraft).toHaveBeenCalledWith('final-keystroke')
  })
})
