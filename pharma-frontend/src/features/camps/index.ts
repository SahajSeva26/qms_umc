// features/camps's public surface — EAGER, lightweight exports only (hooks + their query keys).
//
// Deliberately narrow, not a broad barrel: it exists so other features import through one stable
// entry point instead of reaching into @/features/camps/hooks/<file> or @/features/camps/camps.service
// directly. It must NEVER statically re-export a lazy-loaded component (MyCampScheduleTab,
// PharmaCampScheduleTab, CampDossierPage, etc.) — confirmed via a real disposable Vite build that
// doing so defeats code-splitting for that component even when its OWN consumer still uses
// React.lazy(() => import('the direct path')): Rollup treats any static re-export inside a module
// that's ALSO eagerly reachable (as this barrel is, via these hooks) as pulling the re-exported
// module into the eager chunk too — the dynamic import becomes a no-op split point. Lazy
// components stay reached by their own direct module path; this file only ever grows with more
// eager, cheap exports.
export { useBookCamp } from './hooks/useBookCamp'
export { useDayRangeAvailability } from './hooks/useDayRangeAvailability'
export { usePharmaCamps, pharmaCampKeys } from './hooks/usePharmaCamps'
export { usePharmaMyCamps, pharmaMyCampKeys } from './hooks/usePharmaMyCamps'
