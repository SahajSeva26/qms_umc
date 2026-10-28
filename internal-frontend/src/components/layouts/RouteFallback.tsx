// Suspense fallback for a lazy-loaded feature route, rendered inside
// AppLayout's <main> — the sidebar/topbar shell stays mounted, only this
// content area shows a placeholder while the feature's chunk downloads.
// Deliberately not a full-screen spinner: this fires on every first visit
// to a feature per session, not just once, so it needs to read as "content
// loading" rather than "app loading."
const RouteFallback = () => {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-lg" style={{ background: 'var(--qms-surface-strong)' }} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }} />
        ))}
      </div>
      <div className="h-64 rounded-xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }} />
    </div>
  )
}

export default RouteFallback
