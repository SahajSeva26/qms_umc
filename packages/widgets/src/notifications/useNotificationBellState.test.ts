import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationBellState } from './useNotificationBellState'

describe('useNotificationBellState', () => {
  it('starts closed and unmounted', () => {
    const { result } = renderHook(() => useNotificationBellState())
    expect(result.current.open).toBe(false)
    expect(result.current.popoverMounted).toBe(false)
  })

  it('toggle mounts the popover and opens it', () => {
    const { result } = renderHook(() => useNotificationBellState())

    act(() => result.current.toggle())

    expect(result.current.open).toBe(true)
    expect(result.current.popoverMounted).toBe(true)
  })

  it('toggle again closes it, but it stays mounted (so base-ui can play its close animation)', () => {
    const { result } = renderHook(() => useNotificationBellState())

    act(() => result.current.toggle())
    act(() => result.current.toggle())

    expect(result.current.open).toBe(false)
    expect(result.current.popoverMounted).toBe(true)
  })

  // The regression this hook exists to prevent: a click→click-again (open, then close before the
  // lazy popover chunk resolves) must leave `open` false so the caller's Suspense fallback can be
  // gated on it — not stuck showing a loading shell for a popover the user already closed.
  it('open is false again after an immediate open→close, even while popoverMounted stays true', () => {
    const { result } = renderHook(() => useNotificationBellState())

    act(() => result.current.toggle()) // open
    act(() => result.current.toggle()) // close, before anything else could resolve

    expect(result.current.open).toBe(false)
    expect(result.current.popoverMounted).toBe(true)
  })

  it('setOpen/setDrawerOpen let the popover control state directly (e.g. "View all")', () => {
    const { result } = renderHook(() => useNotificationBellState())

    act(() => result.current.toggle())
    act(() => {
      result.current.setOpen(false)
      result.current.setDrawerOpen(true)
    })

    expect(result.current.open).toBe(false)
    expect(result.current.drawerOpen).toBe(true)
  })
})
