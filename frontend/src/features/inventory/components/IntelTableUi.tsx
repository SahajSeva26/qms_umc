// Shared presentational primitives for the "intel" style tabs (Forecast/
// Audit) — previously defined independently, byte-for-byte, in both
// ForecastTab.tsx and AuditTab.tsx. Consolidated here so both import one
// implementation instead of maintaining two copies.

// '.inv-filter' — sticky filter/toolbar bar shared by every intel tab, exact
// port of inventory.js's injected CSS: flex row, gap 8px, padding 10px 12px,
// sticky top:60px z-index:25.
export function InvFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap rounded-[10px] border mb-3 sticky z-25"
      style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
    >
      {children}
    </div>
  )
}

// '.im-tbl' shell — exact port of inventory-intel.js's injected CSS (lines
// 136-155): border-collapse, 12px font, dashed row borders, hover tint,
// .num right-align + tabular-nums.
export function Th({ children, num }: { children: React.ReactNode; num?: boolean }) {
  return (
    <th
      className={`font-bold uppercase tracking-[.04em] ${num ? 'text-right' : 'text-left'}`}
      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
    >
      {children}
    </th>
  )
}

export function Td({ children, num, bold }: { children: React.ReactNode; num?: boolean; bold?: boolean }) {
  return (
    <td className={num ? 'text-right tabular-nums' : ''} style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
      {bold ? <b>{children}</b> : children}
    </td>
  )
}

// Table "no rows" empty state — previously reimplemented identically (same
// className, same inline style) across every inventory tab's table body.
// Consolidated here — same markup, same values, zero visual change.
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>
        {children}
      </td>
    </tr>
  )
}
