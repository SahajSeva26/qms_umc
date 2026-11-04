// Rendered by a Dashboard section in place of a table/chart/breakdown that has no real backend
// source (as opposed to a KPI tile, which renders "-" via MiniKpiCard for the same reason).
const EmptyLiveData = () => (
  <div className="text-[13px] py-6 text-center rounded-lg border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
    Live data not available
  </div>
)

export default EmptyLiveData
