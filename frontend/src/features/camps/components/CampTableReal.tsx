import type { CampEntity } from '@/types/campReal.types'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { usePermission } from '@/hooks/usePermission'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

interface CampTableRealProps {
  camps: CampEntity[]
  onOpen: (id: string) => void
}

const CampTableReal = ({ camps, onOpen }: CampTableRealProps) => {
  // camps come from search(), which always populates division/doctor/fo, so
  // the id->name fallback tables below are never actually consulted.
  const { doctorName, divisionName, roleName } = useCampRefNames()
  // Company is redundant for a tenant-scoped viewer (every row is their own
  // company) — only worth a column for a platform-tenant viewer who sees across tenants.
  const { session } = usePermission()
  const showCompanyColumn = session?.tenant.type === 'platform'

  const columns = showCompanyColumn
    ? ['Code', 'Schedule', 'Doctor', 'Company', 'Location', 'FO', 'Status']
    : ['Code', 'Schedule', 'Doctor', 'Location', 'FO', 'Status']

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              {columns.map((h) => (
                <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {camps.map((camp) => (
              <tr
                key={camp.id}
                className="transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onOpen(camp.id)}
                    className="font-semibold rounded-md -mx-1 px-1 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: 'var(--qms-brand)', outlineColor: 'var(--qms-brand)' }}
                  >
                    {camp.code}
                  </button>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {new Date(camp.date).toLocaleDateString()}
                  <span style={{ color: 'var(--qms-text-muted)' }}> · {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div style={{ color: 'var(--qms-text)' }}>{doctorName(camp.doctor)}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{divisionName(camp.division)}</div>
                </td>
                {showCompanyColumn && (
                  <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    {camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : '—'}
                  </td>
                )}
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'}</td>
                <td className="px-4 py-2.5">
                  {camp.fo ? (
                    <span style={{ color: 'var(--qms-text)' }}>{roleName(camp.fo)}</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">UNASSIGNED</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><CampStatusPillReal status={camp.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {camps.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No camps found.
        </div>
      )}
    </div>
  )
}

export default CampTableReal
