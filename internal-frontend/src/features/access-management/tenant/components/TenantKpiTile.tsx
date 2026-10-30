import type { ReactNode } from 'react'

const ACCENT = '#8b5cf6'

interface TenantKpiTileProps {
  label: string
  value: ReactNode
  sub?: string
}

export const TenantKpiTile = ({ label, value, sub }: TenantKpiTileProps) => (
  <div
    className="p-2.5 rounded-[11px] border transition-transform duration-100 hover:-translate-y-px"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--qms-border)')}
  >
    <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.03em' }}>
      {label}
    </div>
    <div className="text-[21px] font-extrabold mt-0.5 leading-tight" style={{ color: 'var(--qms-text)' }}>
      {value}
    </div>
    {sub && (
      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
        {sub}
      </div>
    )}
  </div>
)

interface TenantMiniBreakdownProps {
  label: string
  rows: { name: string; value: ReactNode }[]
}

export const TenantMiniBreakdown = ({ label, rows }: TenantMiniBreakdownProps) => (
  <div
    className="p-2.5 rounded-[11px] border col-span-2"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <div className="text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.03em' }}>
      {label}
    </div>
    {rows.map((row, i) => (
      <div
        key={row.name}
        className="flex items-center justify-between gap-2 py-1 text-[12px]"
        style={i < rows.length - 1 ? { borderBottom: '1px dashed var(--qms-border)' } : undefined}
      >
        <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{row.name}</span>
        <span className="font-extrabold" style={{ color: ACCENT }}>{row.value}</span>
      </div>
    ))}
  </div>
)

export const TenantKpiGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`grid gap-2.5 ${className ?? ''}`} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
    {children}
  </div>
)

export const TenantSectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide mb-2.5 mt-1" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.08em' }}>
    <span className="w-1 h-3.5 rounded-sm shrink-0" style={{ background: ACCENT }} />
    {children}
  </div>
)
