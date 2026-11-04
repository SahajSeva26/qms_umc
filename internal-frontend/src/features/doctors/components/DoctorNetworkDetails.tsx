import { useState, type ReactNode } from 'react'
import { FiBriefcase, FiUsers, FiActivity } from 'react-icons/fi'
import PaginationControls from '@/components/ui/PaginationControls'
import { useRoleTypes, useRoles } from '@/features/access-management'
import { useCampsReal } from '@/features/camps'
import { initials } from '@/features/doctors/doctors.ui'
import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import { CAMP_TYPE_LABEL, type CampEntity } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

interface DoctorNetworkDetailsProps {
  doctorId: string
  tenantId: string | null
  tenantName: string
  divisionId: string | null
  divisionName: string
  totalCamps?: number
  canViewMrs: boolean
  canViewCamps: boolean
}

const PAGE_SIZE = 5

const fullName = (role: RoleEntity) => {
  if (!role.user || typeof role.user === 'string') return role.name || '—'
  const user = role.user as RolePopulatedUser
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || role.name || '—'
}

const roleContact = (role: RoleEntity) => {
  if (!role.user || typeof role.user === 'string') return { email: '', phone: '' }
  const user = role.user as RolePopulatedUser
  return { email: user.email ?? '', phone: user.phone ?? '' }
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

const statusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const InlineState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border px-3 py-4 text-center text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
    {children}
  </div>
)

const DoctorNetworkDetails = ({
  doctorId,
  tenantId,
  tenantName,
  divisionId,
  divisionName,
  totalCamps,
  canViewMrs,
  canViewCamps,
}: DoctorNetworkDetailsProps) => {
  const [mrPage, setMrPage] = useState(1)
  const [campPage, setCampPage] = useState(1)

  const {
    data: mrTypeData,
    isLoading: mrTypeLoading,
    isError: mrTypeFailed,
    refetch: refetchMrType,
  } = useRoleTypes(
    { code: 'pharma-mr', status: 'active', tenant: tenantId ?? undefined, limit: '10' },
    canViewMrs && !!tenantId && !!divisionId,
  )
  const mrTypeId = mrTypeData?.data?.items?.[0]?.id

  const {
    data: mrData,
    isLoading: mrsLoading,
    isError: mrsFailed,
    refetch: refetchMrs,
  } = useRoles(
    {
      tenant: tenantId ?? undefined,
      division: divisionId ?? undefined,
      type: mrTypeId,
      status: 'active',
      page: String(mrPage),
      limit: String(PAGE_SIZE),
    },
    canViewMrs && !!tenantId && !!divisionId && !!mrTypeId,
  )
  const mrs = mrData?.data?.items ?? EMPTY_ARRAY
  const mrCount = mrData?.data?.count ?? 0

  const {
    data: campData,
    isLoading: campsLoading,
    isError: campsFailed,
    refetch: refetchCamps,
  } = useCampsReal(
    { doctor: doctorId, report: 'true', page: String(campPage), limit: String(PAGE_SIZE) },
    canViewCamps && !!doctorId,
  )
  const camps = campData?.data?.items ?? EMPTY_ARRAY
  const campCount = campData?.data?.count ?? 0

  const mrTypeMissing = canViewMrs && !mrTypeLoading && !mrTypeFailed && !mrTypeId

  return (
    <>
      <section className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <FiBriefcase size={11} /> Company empanelment &amp; UIN
        </h3>
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <table className="w-full min-w-[560px] text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Company', 'UIN', 'Division', 'Camps'].map((label) => (
                  <th key={label} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{tenantName}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Not recorded</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{divisionName}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{totalCamps ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <FiUsers size={11} /> MRs covering this doctor{!mrsLoading && !mrsFailed && mrTypeId ? ` (${mrCount})` : ''}
        </h3>
        {!canViewMrs ? (
          <InlineState>MR coverage is unavailable with your current role-directory permissions.</InlineState>
        ) : !tenantId || !divisionId ? (
          <InlineState>This doctor needs both a company and division before MR coverage can be resolved.</InlineState>
        ) : mrTypeFailed ? (
          <InlineState>
            Could not load the MR role configuration.{' '}
            <button type="button" className="font-semibold underline" onClick={() => refetchMrType()}>Retry</button>
          </InlineState>
        ) : mrTypeMissing ? (
          <InlineState>This company has no active Pharma MR role type configured.</InlineState>
        ) : mrTypeLoading || mrsLoading ? (
          <InlineState>Loading same-division MRs…</InlineState>
        ) : mrsFailed ? (
          <InlineState>
            Could not load same-division MRs.{' '}
            <button type="button" className="font-semibold underline" onClick={() => refetchMrs()}>Retry</button>
          </InlineState>
        ) : mrs.length === 0 ? (
          <InlineState>No active MRs were found in this doctor&apos;s division.</InlineState>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {mrs.map((mr) => {
                const name = fullName(mr)
                const contact = roleContact(mr)
                return (
                  <div key={mr.id} className="rounded-xl border px-3 py-2.5 flex items-center gap-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,var(--qms-brand),var(--qms-teal))' }}>
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
                      <div className="text-[10.5px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                        {[contact.email, contact.phone].filter(Boolean).join(' · ') || mr.code}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <PaginationControls page={mrPage} totalPages={Math.ceil(mrCount / PAGE_SIZE)} onPageChange={setMrPage} />
          </>
        )}
      </section>

      <section className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <FiActivity size={11} /> Camp history{!campsLoading && !campsFailed ? ` (${campCount})` : ''}
        </h3>
        {!canViewCamps ? (
          <InlineState>Camp history is unavailable with your current camp permissions.</InlineState>
        ) : campsLoading ? (
          <InlineState>Loading camp history…</InlineState>
        ) : campsFailed ? (
          <InlineState>
            Could not load camp history.{' '}
            <button type="button" className="font-semibold underline" onClick={() => refetchCamps()}>Retry</button>
          </InlineState>
        ) : camps.length === 0 ? (
          <InlineState>No camps have been recorded for this doctor.</InlineState>
        ) : (
          <>
            <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
              <table className="w-full min-w-[660px] text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    {['ID', 'Date', 'Type', 'City', 'Status', 'Patients'].map((label) => (
                      <th key={label} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {camps.map((camp: CampEntity) => (
                    <tr key={camp.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{camp.code}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{formatDate(camp.date)}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{CAMP_TYPE_LABEL[camp.type]}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{camp.location?.city || '—'}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{statusLabel(camp.status)}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>
                        {camp.stats ? `${camp.stats.patientsCompleted}/${camp.patientExpectation}` : `—/${camp.patientExpectation}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls page={campPage} totalPages={Math.ceil(campCount / PAGE_SIZE)} onPageChange={setCampPage} />
          </>
        )}
      </section>
    </>
  )
}

export default DoctorNetworkDetails

