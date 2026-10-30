import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Testing Library's default 1000ms waitFor/findBy timeout assumes light/isolated execution —
// under the full ~245-file suite's CPU contention, real async resolutions can exceed that purely
// from scheduling delay, not a genuine failure. Raised to match testTimeout in vitest.config.ts.
configure({ asyncUtilTimeout: 5_000 })

// jsdom has no real IntersectionObserver — a global no-op stub so any component using it
// (e.g. scroll-triggered infinite loading) doesn't crash tests that don't care about it.
// A test that does care installs its own controllable mock instead (see
// DayStripAvailability.test.tsx's FakeIntersectionObserver).
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly scrollMargin = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }
  globalThis.IntersectionObserver = NoopIntersectionObserver as unknown as typeof IntersectionObserver
}
