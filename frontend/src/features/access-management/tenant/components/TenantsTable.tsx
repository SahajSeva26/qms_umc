import { useNavigate } from 'react-router-dom'
import { FiChevronRight, FiMapPin } from 'react-icons/fi'
import type { Tenant } from '@/types/accessManagement.types'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'

// Prototype's .cm-row: no shared header row, each stat self-labels (value + kicker underneath).
// Divisions/MRs/Billing are placeholders — real data needs the backend work in md-files/ui-revisions.md.

interface TenantsTableProps {
  tenants: Tenant[]
}

function formatCreated(createdAt?: string): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Prototype's clientRowData(): [city, state].filter(Boolean).join(', ') || '—'.
function formatLocation(tenant: Tenant): string {
  const parts = [tenant.address?.city, tenant.address?.state].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

interface StatProps {
  value: React.ReactNode
  label: string
}

// Prototype's .rt-stat: bold value (.v) + small uppercase kicker label (.k) directly underneath.
const Stat = ({ value, label }: StatProps) => (
  <div className="w-16 shrink-0">
    <div className="text-[13px] font-extrabold leading-tight whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
      {value}
    </div>
    <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.04em' }}>
      {label}
    </div>
  </div>
)

const TenantsTable = ({ tenants }: TenantsTableProps) => {
  const navigate = useNavigate()

  return (
    // Each row needs ~700px+ (name block + 5 stat blocks + status/created/chevron) — overflow-x-auto
    // + a row min-width keeps it usable on narrow panes instead of squeezing/wrapping the stats.
    <div className="flex flex-col gap-2 overflow-x-auto">
      {tenants.map((tenant) => (
        <div
          key={tenant.id}
          onClick={() => navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenant.id))}
          className="flex items-center gap-3 px-4 py-3 min-w-175 rounded-[11px] border cursor-pointer transition-[border-color,transform] duration-100 hover:-translate-y-px"
          style={{
            background: 'var(--qms-surface)',
            borderColor: 'var(--qms-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cm-accent, var(--qms-brand))')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--qms-border)')}
        >
          <div className="flex-1 min-w-32">
            <div className="text-[14px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>
              {tenant.name}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
              <FiMapPin className="shrink-0" size={11} />
              <span className="truncate">{formatLocation(tenant)} · {tenant.code}</span>
            </div>
          </div>

          <Stat
            value={<span className="text-[10px] font-bold italic" style={{ color: 'var(--cm-accent, var(--qms-brand))' }}>Coming soon</span>}
            label="Divisions"
          />
          <Stat
            value={<span className="text-[10px] font-bold italic" style={{ color: 'var(--cm-accent, var(--qms-brand))' }}>Coming soon</span>}
            label="MRs"
          />
          <Stat
            value={
              tenant.stats
                ? <>{tenant.stats.liveProjects}<span style={{ color: 'var(--qms-text-muted)' }}>/{tenant.stats.totalProjects}</span></>
                : <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
            }
            label="Projects"
          />
          <Stat
            value={
              tenant.stats
                ? <>{tenant.stats.totalCamps}</>
                : <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
            }
            label="Camps"
          />
          <Stat
            value={<span className="text-[10px] font-bold italic" style={{ color: 'var(--cm-accent, var(--qms-brand))' }}>Coming soon</span>}
            label="Billing"
          />

          <div className="w-20 shrink-0">
            <TenantStatusPill status={tenant.status} />
          </div>

          <div className="w-20 shrink-0 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {formatCreated(tenant.createdAt)}
          </div>

          <FiChevronRight className="shrink-0" size={16} style={{ color: 'var(--qms-text-muted)' }} />
        </div>
      ))}

      {tenants.length === 0 && (
        <div
          className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed"
          style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}
        >
          No companies found.
        </div>
      )}
    </div>
  )
}

export default TenantsTable
