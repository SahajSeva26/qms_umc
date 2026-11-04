import { useMemo } from 'react'
import { FiMapPin, FiGlobe } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useMyEmployee } from '@/features/fieldWorkspace/hooks/useMyEmployee'
import { useMyGeoProfile } from '@/features/fieldWorkspace/hooks/useMyGeoProfile'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import { useMyRating } from '@/features/fieldWorkspace/hooks/useMyRating'
import { useMyInventoryAssignments } from '@/features/fieldWorkspace/hooks/useMyInventoryAssignments'
import { FopPageHeading, FopCard, FopCardHeader, FopKpi, FopPill } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Masks all but the last 4 characters — PAN/Aadhar, same convention the roster drawer uses.
function mask(value: string | undefined): string {
  if (!value) return '—'
  return value.length <= 4 ? value : `${'•'.repeat(value.length - 4)}${value.slice(-4)}`
}

// Mirrors the prototype's Profile tab — Edit button, cert-valid pill, occupancy %, TA rule, and
// the permanent/temporary address split are dropped (no backend support for any of them; see
// the session's FO Workspace survey).
const ProfileTab = () => {
  const { session } = useSession()
  const { employee, isLoading: employeeLoading, error: employeeError, refetch: refetchEmployee } = useMyEmployee()
  const { geoProfile } = useMyGeoProfile()
  const rating = useMyRating()
  const myCamps = useMyCamps({ limit: '200' }, !!session)
  const devices = useMyInventoryAssignments('InventoryDevice')

  const camps = myCamps.data?.data?.items ?? EMPTY_ARRAY
  const closedCount = useMemo(() => camps.filter((c) => c.status === 'closed').length, [camps])
  const upcomingCount = useMemo(() => camps.filter((c) => c.status === 'confirmed').length, [camps])

  const name = session ? `${session.user.firstName} ${session.user.lastName}`.trim() : ''
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const supervisor = employee?.supervisor
  const supervisorName =
    supervisor && typeof supervisor !== 'string'
      ? [supervisor.profile?.firstName, supervisor.profile?.lastName].filter(Boolean).join(' ') || supervisor.email
      : null

  return (
    <div>
      <FopPageHeading title="Profile" subtitle="My HR record · personal details · contact info" />

      <QueryStateBlock
        isLoading={employeeLoading}
        error={employeeError}
        loadingLabel="Loading profile…"
        errorLabel="Couldn't load your profile."
        onRetry={() => void refetchEmployee()}
      >
        <FopCard>
          <div className="flex gap-3.5 items-start">
            <div
              className="w-[72px] h-[72px] rounded-[18px] shrink-0 flex items-center justify-center font-extrabold text-[26px] text-white"
              style={{ background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)' }}
            >
              {initials || '—'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-lg" style={{ color: 'var(--qms-text)' }}>{name || 'Field Officer'}</div>
              <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                {[employee?.email, employee?.phone].filter(Boolean).join(' · ') || '—'}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {geoProfile?.city && (
                  <FopPill tone="blue"><FiMapPin size={10} className="inline -mt-0.5 mr-0.5" /> {geoProfile.city}</FopPill>
                )}
                {geoProfile?.state && (
                  <FopPill tone="violet"><FiGlobe size={10} className="inline -mt-0.5 mr-0.5" /> {geoProfile.state}</FopPill>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 mt-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            <FopKpi label="Closed camps" value={closedCount} sub="Lifetime" icon={FiMapPin} />
            <FopKpi label="Upcoming" value={upcomingCount} sub="In schedule" icon={FiMapPin} tone="green" />
            <FopKpi label="★ Rating" value={rating.average ?? '—'} sub="Camp-weighted" icon={FiMapPin} />
          </div>
        </FopCard>

        <FopCard>
          <FopCardHeader>Personal &amp; HR</FopCardHeader>
          <table className="w-full text-[12px] border-collapse">
            <tbody>
              <Row label="Joined" value={employee?.doj ? new Date(employee.doj).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
              <Row label="Reports to" value={supervisorName ?? '—'} />
              <Row label="PAN" value={mask(employee?.panNumber)} />
              <Row label="Aadhar" value={mask(employee?.aadharNumber)} />
              <Row label="Salary" value={employee?.salary ? `₹${employee.salary.toLocaleString('en-IN')} / month` : '—'} />
              <Row label="DA rule" value={employee?.daRule ? `${employee.daRule.type} · ${employee.daRule.value}` : 'Standard'} />
              <Row label="Address" value={[employee?.location?.addressLine1, employee?.location?.city, employee?.location?.state].filter(Boolean).join(', ') || '—'} />
              <Row label="Devices assigned" value={String(devices.data?.data.count ?? 0)} />
            </tbody>
          </table>
        </FopCard>
      </QueryStateBlock>
    </div>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <tr className="border-b border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
    <th className="text-left py-2 pr-2 font-bold" style={{ width: '34%', color: 'var(--qms-text-muted)' }}>{label}</th>
    <td className="py-2" style={{ color: 'var(--qms-text)' }}>{value}</td>
  </tr>
)

export default ProfileTab
