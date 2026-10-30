import { useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useMrTeam, useDirectReports } from '@/features/pharma/hooks/useTeamHierarchy'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { RoleEntity } from '@/types/accessManagement.types'

function reportName(role: RoleEntity): string {
  const user = typeof role.user === 'string' ? null : role.user
  if (!user?.firstName) return role.name
  return `${user.firstName} ${user.lastName ?? ''}`.trim()
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const AVATAR_COLORS = ['var(--qms-brand)', 'var(--qms-teal)', '#a855f7', '#f59e0b', '#ef4444', '#10b981']
function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

interface ReportRowProps {
  role: RoleEntity
  /** Leaf rows (MRs) have no further downline — renders flat, no expand affordance. */
  isLeaf?: boolean
  children?: React.ReactNode
}

// Expand toggle's nested content only mounts once opened, so a manager with many reports
// doesn't eagerly fire every descendant's query on load.
const ReportRow = ({ role, isLeaf, children }: ReportRowProps) => {
  const [expanded, setExpanded] = useState(false)
  const name = reportName(role)
  const user = typeof role.user === 'string' ? null : role.user

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <button
        type="button"
        onClick={() => !isLeaf && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 p-3 text-left ${isLeaf ? '' : 'cursor-pointer'}`}
        disabled={isLeaf}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
          style={{ background: avatarColor(role.id) }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {role.code}{user?.email ? ` · ${user.email}` : ''}
          </div>
        </div>
        {!isLeaf && (
          expanded
            ? <FiChevronDown size={16} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
            : <FiChevronRight size={16} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
        )}
      </button>
      {!isLeaf && expanded && (
        <div className="px-3 pb-3 pl-[3.25rem] space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

interface MrCardProps {
  mr: RoleEntity
}

// No per-camp-type counts — GET /camps has no `mr` filter server-side (silently stripped), so a
// count here would show the caller's own scope, not that MR's. Flagged to backend.
const MrCard = ({ mr }: MrCardProps) => {
  const name = reportName(mr)
  const user = typeof mr.user === 'string' ? null : mr.user
  const color = avatarColor(mr.id)

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid var(--qms-border)',
        borderLeftWidth: '3px',
        borderLeftColor: color,
        background: 'var(--qms-surface-card)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="text-[11px] mt-0.5 truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>
            {mr.code}
          </div>
        </div>
      </div>
      {user?.email && (
        <div className="text-[11.5px] mt-3 pt-3 truncate" style={{ color: 'var(--qms-text-muted)', borderTop: '1px solid var(--qms-border)' }}>
          {user.email}
        </div>
      )}
    </div>
  )
}

interface AsmNestedMrsProps {
  asmRoleId: string
}

// RSM's expanded ASM card — fetches that ASM's own MRs only once expanded.
const AsmNestedMrs = ({ asmRoleId }: AsmNestedMrsProps) => {
  const { roles: mrs, isLoading, error } = useDirectReports(asmRoleId, 'pharma-mr', true)
  return (
    <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading MRs…" errorLabel="Couldn't load MRs for this ASM.">
      {mrs.length === 0 ? (
        <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>No MRs reporting to this ASM yet.</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {mrs.map((mr) => <MrCard key={mr.id} mr={mr} />)}
        </div>
      )}
    </QueryStateBlock>
  )
}

interface RsmNestedAsmsProps {
  rsmRoleId: string
}

// HO's expanded RSM card — fetches that RSM's own ASMs, each further expandable into MRs.
const RsmNestedAsms = ({ rsmRoleId }: RsmNestedAsmsProps) => {
  const { roles: asms, isLoading, error } = useDirectReports(rsmRoleId, 'pharma-asm', true)
  return (
    <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading ASMs…" errorLabel="Couldn't load ASMs for this RSM.">
      {asms.length === 0 ? (
        <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>No ASMs reporting to this RSM yet.</div>
      ) : (
        <div className="space-y-2">
          {asms.map((asm) => (
            <ReportRow key={asm.id} role={asm}>
              <AsmNestedMrs asmRoleId={asm.id} />
            </ReportRow>
          ))}
        </div>
      )}
    </QueryStateBlock>
  )
}

const TAB_COPY: Record<string, { heading: string; sub: (count: number) => string; empty: string }> = {
  'pharma-asm': {
    heading: 'My team',
    sub: (count) => `${count} MR${count === 1 ? '' : 's'} reporting to you`,
    empty: 'No MRs reporting to you yet.',
  },
  'pharma-rsm': {
    heading: 'My ASMs',
    sub: (count) => `${count} ASM${count === 1 ? '' : 's'} in your region · expand each to see their MR team`,
    empty: 'No ASMs reporting to you yet.',
  },
  'pharma-division-head': {
    heading: 'My RSMs',
    sub: (count) => `${count} RSM${count === 1 ? '' : 's'} in your division · expand each to see their ASM and MR teams`,
    empty: 'No RSMs reporting to you yet.',
  },
}

// Downline hierarchy for HO/RSM/ASM, replacing the Doctors tab: ASM sees direct MRs, RSM sees
// ASMs (expandable to MRs), HO sees RSMs (expandable to ASMs, then MRs). MR keeps Doctors instead.
const PharmaMyTeamTab = () => {
  const { session } = useSession()
  const roleTypeCode = session?.roleType?.code ?? ''
  const selfRoleId = session?.role.id

  const copy = TAB_COPY[roleTypeCode]

  const asmTeam = useMrTeam(roleTypeCode === 'pharma-asm')
  const rsmAsms = useDirectReports(selfRoleId, 'pharma-asm', roleTypeCode === 'pharma-rsm')
  const hoRsms = useDirectReports(selfRoleId, 'pharma-rsm', roleTypeCode === 'pharma-division-head')

  if (!copy) {
    return (
      <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        This view isn't available for your role.
      </div>
    )
  }

  const { roles, isLoading, error, label } =
    roleTypeCode === 'pharma-asm'
      ? { roles: asmTeam.roles, isLoading: asmTeam.isLoading, error: asmTeam.error, label: 'MRs' }
      : roleTypeCode === 'pharma-rsm'
        ? { roles: rsmAsms.roles, isLoading: rsmAsms.isLoading, error: rsmAsms.error, label: 'ASMs' }
        : { roles: hoRsms.roles, isLoading: hoRsms.isLoading, error: hoRsms.error, label: 'RSMs' }

  return (
    <div>
      <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="text-[14px] font-bold" style={{ color: 'var(--qms-text)' }}>{copy.heading}</div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {isLoading || error ? `Loading your ${label}…` : copy.sub(roles.length)}
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel={`Loading your ${label}…`} errorLabel={`Couldn't load your ${label}.`}>
        {roles.length === 0 ? (
          <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            {copy.empty}
          </div>
        ) : roleTypeCode === 'pharma-asm' ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {(roles ?? EMPTY_ARRAY).map((mr) => <MrCard key={mr.id} mr={mr} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(roles ?? EMPTY_ARRAY).map((role) =>
              roleTypeCode === 'pharma-rsm'
                ? <ReportRow key={role.id} role={role}><AsmNestedMrs asmRoleId={role.id} /></ReportRow>
                : <ReportRow key={role.id} role={role}><RsmNestedAsms rsmRoleId={role.id} /></ReportRow>,
            )}
          </div>
        )}
      </QueryStateBlock>
    </div>
  )
}

export default PharmaMyTeamTab
