import { Fragment, useState, type ReactNode } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import type { CampEntity } from '@/types/campReal.types'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { usePermission } from '@/hooks/usePermission'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

interface CampTableRealProps {
  camps: CampEntity[]
  onOpen: (id: string) => void
}

// city/state can each independently be an empty string from an unresolved
// geocode — join only the present parts so a partial address never renders
// a bare or dangling comma.
const formatCityState = (location: CampEntity['location']) =>
  location ? [location.city, location.state].filter(Boolean).join(', ') : ''

const CampTableReal = ({ camps, onOpen }: CampTableRealProps) => {
  // camps come from search(), which always populates division/doctor/fo/project, so
  // the id->name fallback tables below are never actually consulted.
  const { doctorName, divisionName, roleName, projectName } = useCampRefNames()
  // Company is redundant for a tenant-scoped viewer (every row is their own
  // company) — only worth a column for a platform-tenant viewer who sees across tenants.
  const { session } = usePermission()
  const showCompanyColumn = session?.tenant.type === 'platform'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 'Row details' is the toggle column — a trailing action column (after
  // Status), not part of the camp's own identity — included here (not left
  // out) so columns.length, used below for colSpan, always matches the real
  // header count, including the platform-only Company column.
  const columns = showCompanyColumn
    ? ['Code', 'Schedule', 'Doctor', 'Company', 'Location', 'FO', 'Status', 'Row details']
    : ['Code', 'Schedule', 'Doctor', 'Location', 'FO', 'Status', 'Row details']

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
                <th
                  key={h}
                  className={`font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 ${h === 'Row details' ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  {h === 'Row details' ? <span className="sr-only">{h}</span> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {camps.map((camp) => {
              const isExpanded = expandedId === camp.id
              const panelId = `camp-detail-${camp.id}`

              return (
                <Fragment key={camp.id}>
                  <tr
                    className="transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--qms-border)' }}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => onOpen(camp.id)}
                        className="font-semibold rounded-md -mx-1 px-1 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{ color: 'var(--qms-brand)', outlineColor: 'var(--qms-brand)' }}
                      >
                        {camp.code}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
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
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{formatCityState(camp.location) || 'Location unavailable'}</td>
                    <td className="px-4 py-2.5">
                      {camp.fo ? (
                        <span style={{ color: 'var(--qms-text)' }}>{roleName(camp.fo)}</span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">UNASSIGNED</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5"><CampStatusPillReal status={camp.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId((prev) => (prev === camp.id ? null : camp.id))}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${camp.code}`}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="inline-flex items-center justify-center size-8 rounded-md transition-colors hover:bg-(--qms-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{ color: 'var(--qms-text-muted)', outlineColor: 'var(--qms-brand)' }}
                      >
                        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td
                        colSpan={columns.length}
                        className="px-6 py-5"
                        style={{ background: 'var(--qms-surface-strong)', borderTop: '1px solid var(--qms-border)' }}
                      >
                        <CampRowDetailPanel
                          id={panelId}
                          camp={camp}
                          doctorName={doctorName}
                          divisionName={divisionName}
                          roleName={roleName}
                          projectName={projectName}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
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

interface CampRowDetailPanelProps {
  id: string
  camp: CampEntity
  doctorName: ReturnType<typeof useCampRefNames>['doctorName']
  divisionName: ReturnType<typeof useCampRefNames>['divisionName']
  roleName: ReturnType<typeof useCampRefNames>['roleName']
  projectName: ReturnType<typeof useCampRefNames>['projectName']
}

const CampRowDetailPanel = ({ id, camp, doctorName, divisionName, roleName, projectName }: CampRowDetailPanelProps) => {
  const doctor = camp.doctor && typeof camp.doctor !== 'string' ? camp.doctor : null
  const clientName = camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : undefined
  const cityState = formatCityState(camp.location)

  return (
    <div id={id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-8 gap-y-5">
      <div>
        <SectionTitle>Camp Details</SectionTitle>
        <DetailField label="Code" value={camp.code} />
        <DetailField label="Type" value={camp.type} />
        <DetailField label="Patient target" value={camp.patientExpectation} />
      </div>

      <div>
        <SectionTitle>Client &amp; Division</SectionTitle>
        <DetailField label="Client" value={clientName} />
        <DetailField label="Division" value={divisionName(camp.division)} />
        <DetailField label="MR" value={camp.mr ? roleName(camp.mr) : undefined} />
      </div>

      <div>
        <SectionTitle>Camp Location</SectionTitle>
        {camp.location ? (
          <>
            <DetailField label="Address" value={camp.location.addressLine1} />
            <DetailField label="" value={camp.location.addressLine2} />
            <DetailField label="Locality" value={camp.location.locality} />
            <DetailField label="City/State" value={cityState || undefined} />
            <DetailField label="Pincode" value={camp.location.pincode} />
          </>
        ) : (
          <span style={{ color: 'var(--qms-text-muted)' }}>Location unavailable</span>
        )}
      </div>

      <div>
        <SectionTitle>People &amp; assignments</SectionTitle>
        <DetailField label="Project" value={camp.project ? projectName(camp.project) : undefined} />
        <DetailField label="Doctor" value={doctorName(camp.doctor)} />
        <DetailField label="Specialization" value={doctor?.specialization} />
        <DetailField label="FO" value={camp.fo ? roleName(camp.fo) : undefined} />
      </div>

      <div>
        <SectionTitle>Date &amp; Slot</SectionTitle>
        <DetailField label="Date" value={new Date(camp.date).toLocaleDateString()} />
        <DetailField label="Slot" value={camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : undefined} />
        <DetailField label="Created" value={new Date(camp.createdAt).toLocaleDateString()} />
      </div>
    </div>
  )
}

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </div>
)

interface DetailFieldProps {
  label: string
  value?: string | number | null
}

// A bare falsy check would wrongly hide a legitimate 0 (e.g. patientExpectation)
// — only null/undefined/'' count as "unavailable, omit this field."
const DetailField = ({ label, value }: DetailFieldProps) => {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="mb-2">
      {label && <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>}
      <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{value}</div>
    </div>
  )
}

export default CampTableReal
