// A permission fact, not a loading/error/empty outcome — no call is fired when this renders.
const AnalyticsNotAvailable = ({ reason }: { reason: string }) => (
  <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
    Not available for your access level — {reason}.
  </div>
)

export default AnalyticsNotAvailable
