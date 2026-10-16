import type { ReactNode } from 'react'
import type { CompanyDivisionRow } from '@/features/crm/salesDashboard/salesDashboard.today'
import { formatINR } from '@/utils/formatters'
import UserAvatar from '@/components/ui/UserAvatar'

interface CompanyDivisionsSectionProps {
  rows: CompanyDivisionRow[]
  isLoading: boolean
  isError: boolean
}

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[20px] border p-4.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
    <div className="mb-3">
      <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>My companies + divisions</h3>
    </div>
    {children}
  </div>
)

// "My companies + divisions" — real counts (divisions represented in my own projects, project
// count) + a real, honestly-labeled "Committed value" (Σ campCost × totalCamps — a contracted/
// planned figure, never "Billed"/"Paid": invoice:* is architecturally unreachable for Sales
// Head/Rep, see salesDashboard.today.ts). "N PO pending" only counts projects whose
// executionMode.mode is 'po' — agreement/mail-confirmation projects are excluded rather than shown
// as "0 pending". Division chips reflect ONLY divisions this rep has a project in — not the
// company's true full division roster (adding a division:search call per company to close that gap
// was rejected to avoid an N-request fan-out on this temporary dashboard).
const CompanyDivisionsSection = ({ rows, isLoading, isError }: CompanyDivisionsSectionProps) => {
  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'var(--qms-surface-strong)' }} />
          ))}
        </div>
      </Shell>
    )
  }

  if (isError) {
    return (
      <Shell>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Couldn't load your companies — try again shortly.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        {rows.length} compan{rows.length === 1 ? 'y' : 'ies'} · {rows.reduce((sum, r) => sum + r.divisionCount, 0)} division{rows.reduce((sum, r) => sum + r.divisionCount, 0) === 1 ? '' : 's'} represented in my projects
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No companies yet.</p>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--qms-border)' }}>
          {rows.map((row) => (
            <div key={row.tenantId} className="py-3 first:pt-0 last:pb-0" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar firstName={row.tenantName} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{row.tenantName}</div>
                    <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {row.divisionCount} div · {row.projectCount} project{row.projectCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[14px]" style={{ color: 'var(--qms-text)' }}>{formatINR(row.committedValue)}</div>
                  <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                    committed
                    {row.poPendingCount > 0 && <> · <span style={{ color: 'var(--qms-brand)' }}>{row.poPendingCount} PO pending</span></>}
                  </div>
                </div>
              </div>
              {row.divisionNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {row.divisionNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

export default CompanyDivisionsSection
