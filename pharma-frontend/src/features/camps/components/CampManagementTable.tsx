import { Fragment, useState, type ReactNode } from 'react'
import { FiChevronDown, FiChevronUp, FiAlertTriangle } from 'react-icons/fi'
import type { CampEntity } from '@/types/campReal.types'
import { CopyButton } from '@qms/ui'
import CampDashboardStatusPill from '@/features/camps/components/CampDashboardStatusPill'
import { specializationLabel } from '@/types/doctor.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

interface CampManagementTableProps {
  camps: CampEntity[]
  onOpen: (id: string) => void
}

// city/state can independently be empty from an unresolved geocode — join only present parts to avoid a dangling comma.
const formatCityState = (location: CampEntity['location']) =>
  location ? [location.city, location.state].filter(Boolean).join(', ') : ''

const doctorName = (doctor: CampEntity['doctor']) =>
  doctor && typeof doctor !== 'string' ? doctor.name : (doctor ?? '—')

const roleName = (role: CampEntity['fo']) =>
  role && typeof role !== 'string' ? role.name : (role ?? undefined)

const divisionName = (division: CampEntity['division']) =>
  division && typeof division !== 'string' ? division.name : (division ?? undefined)

const projectName = (project: CampEntity['project']) =>
  project && typeof project !== 'string' ? project.name : (project ?? undefined)

// Ported from internal-frontend's CampTableReal.tsx. No Company column — every pharma session is
// tenant-scoped (never a platform-tenant viewer, the only case that column existed for), so it's
// dropped entirely rather than carried as always-false. camp.doctor/division/fo/mr/project are
// always populated by search(), same as the original's own comment notes, so no id->name fallback
// lookup hook is needed — these are plain inline accessors against the populated shape.
const CampManagementTable = ({ camps, onOpen }: CampManagementTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const columns = ['Code', 'Schedule', 'Doctor', 'Location', 'Staff', 'Status', 'Row details']

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
                  className={`font-bold text-[11px] uppercase tracking-[.06em] px-4 py-2.5 ${h === 'Row details' ? 'text-right' : 'text-left'}`}
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpen(camp.id)}
                          className="font-semibold rounded-md -mx-1 px-1 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ color: 'var(--qms-brand)', outlineColor: 'var(--qms-brand)' }}
                        >
                          {camp.code}
                        </button>
                        <CopyButton value={camp.code} label="Code" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                      {new Date(camp.date).toLocaleDateString()}
                      <span style={{ color: 'var(--qms-text-muted)' }}> · {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div style={{ color: 'var(--qms-text)' }}>{doctorName(camp.doctor)}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{divisionName(camp.division) ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{formatCityState(camp.location) || 'Location unavailable'}</td>
                    <td className="px-4 py-2.5">
                      {/* Diet camps are staffed by a dietitian instead of an FO (camp.dietitian, not camp.fo). */}
                      {(camp.type === 'diet' ? camp.dietitian : camp.fo) ? (
                        <span style={{ color: 'var(--qms-text)' }}>{roleName(camp.type === 'diet' ? camp.dietitian : camp.fo)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
                          <FiAlertTriangle size={10} /> Missing {camp.type === 'diet' ? 'Dietitian' : 'FO'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5"><CampDashboardStatusPill status={camp.status} /></td>
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
                        <CampRowDetailPanel id={panelId} camp={camp} />
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
}

const CampRowDetailPanel = ({ id, camp }: CampRowDetailPanelProps) => {
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
        <DetailField label="Specialization" value={doctor?.specialization ? specializationLabel(doctor.specialization) : undefined} />
        <DetailField
          label={camp.type === 'diet' ? 'Dietitian' : 'FO'}
          value={(camp.type === 'diet' ? camp.dietitian : camp.fo) ? roleName(camp.type === 'diet' ? camp.dietitian : camp.fo) : undefined}
        />
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

export default CampManagementTable
