import { useMemo } from 'react'
import { FiArchive, FiFileText, FiAlertTriangle, FiExternalLink } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import FopCampRow from '@/features/fieldWorkspace/components/FopCampRow'
import { FopPageHeading, FopKpiGrid, FopKpi, FopCard, FopCardHeader, FopTable, FopCta } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import { isPendingClosure } from '@/features/fieldWorkspace/fieldWorkspace.utils'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { CAMPS_ROUTES } from '@/features/camps/camps.paths'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Mirrors the prototype's Camp Reports History tab. The prototype's "Patients (lifetime)" KPI
// sums fields that don't exist on the real Camp model — this uses the real per-camp
// stats.patientsCompleted (from the search's report=true, set by the myCamps backend call).
const CampReportsHistoryTab = () => {
  const myCamps = useMyCamps({ limit: '200' }, true)
  const camps = myCamps.data?.data?.items ?? EMPTY_ARRAY

  const closedCamps = useMemo(() => [...camps.filter((c) => c.status === 'closed')].sort((a, b) => b.date.localeCompare(a.date)), [camps])
  const pendingClosure = useMemo(() => camps.filter((c) => isPendingClosure(c.date, c.status)), [camps])
  const lifetimePatients = useMemo(() => closedCamps.reduce((sum, c) => sum + (c.stats?.patientsCompleted ?? 0), 0), [closedCamps])

  return (
    <div>
      <FopPageHeading title="Camp Reports History" subtitle="Closed camps · pending closures" />

      <QueryStateBlock
        isLoading={myCamps.isLoading}
        error={myCamps.error}
        loadingLabel="Loading camp reports…"
        errorLabel="Couldn't load your camp reports."
        onRetry={() => void myCamps.refetch()}
      >
        <FopKpiGrid>
          <FopKpi label="Closed" value={closedCamps.length} sub="Lifetime" icon={FiArchive} tone="green" />
          <FopKpi label="Pending closure" value={pendingClosure.length} sub="Need report + close" icon={FiFileText} tone={pendingClosure.length ? 'red' : ''} />
          <FopKpi label="Patients (lifetime)" value={lifetimePatients} sub="Across closed camps" icon={FiFileText} />
        </FopKpiGrid>

        {pendingClosure.length > 0 && (
          <FopCard style={{ background: 'rgba(244,63,94,.05)', borderColor: 'rgba(244,63,94,.3)' }}>
            <FopCardHeader>
              <span style={{ color: '#b91c1c' }}><FiAlertTriangle size={14} className="inline -mt-0.5 mr-1.5" />Pending closure</span>
            </FopCardHeader>
            {pendingClosure.map((camp) => <FopCampRow key={camp.id} camp={camp} />)}
          </FopCard>
        )}

        <FopCard>
          <FopCardHeader>Closed camps</FopCardHeader>
          <FopTable>
            <thead>
              <tr>
                <Th>Camp</Th>
                <Th>Date</Th>
                <Th>City</Th>
                <Th>Patients</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {closedCamps.map((camp) => (
                <tr key={camp.id}>
                  <Td>
                    <b>{camp.code}</b>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.type}</div>
                  </Td>
                  <Td>{new Date(camp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Td>
                  <Td>{camp.location?.city ?? '—'}</Td>
                  <Td>{camp.stats?.patientsCompleted ?? 0}</Td>
                  <Td>
                    <Link to={`${CAMPS_ROUTES.CAMPS}?camp=${camp.id}`}>
                      <FopCta tone="ghost" sm><FiExternalLink size={13} /> Open</FopCta>
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </FopTable>
        </FopCard>
      </QueryStateBlock>
    </div>
  )
}

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="py-2 px-1.5 text-left text-[10px] font-extrabold uppercase tracking-wide border-b border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>{children}</th>
)
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="py-2 px-1.5 border-b border-dashed" style={{ borderColor: 'var(--qms-border)' }}>{children}</td>
)

export default CampReportsHistoryTab
