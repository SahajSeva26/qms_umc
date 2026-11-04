import { useMemo } from 'react'
import { FiAlertTriangle, FiCalendar, FiClock, FiFileText, FiPackage, FiCpu, FiCheckCircle, FiGrid, FiRadio } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import { useMyInventoryAssignments } from '@/features/fieldWorkspace/hooks/useMyInventoryAssignments'
import { FopPageHeading, FopCard, FopCardHeader, FopKpiGrid, FopKpi, FopAlert } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import { isPendingClosure } from '@/features/fieldWorkspace/fieldWorkspace.utils'
import { dayKey, addDays } from '@/utils/calendarDate'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const BUCKET_META = [
  { key: 'confirmed' as const, label: 'Upcoming', icon: FiClock },
  { key: 'live' as const, label: 'Live', icon: FiRadio },
  { key: 'closed' as const, label: 'Completed', icon: FiCheckCircle },
]

// Mirrors the prototype's Dashboard tab (fo-portal.js) — reshaped to the 6 KPI tiles with real
// backend support (Reports to Upload/Pending Claims/Open SOS/Attendance Today dropped — no
// backend concept exists for any of them).
const DashboardTab = () => {
  const { session } = useSession()
  const todayKey = dayKey(new Date())
  const monthStart = dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const monthEnd = dayKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

  const myCamps = useMyCamps({ limit: '200' }, !!session)
  const camps = myCamps.data?.data?.items ?? EMPTY_ARRAY
  const summary = myCamps.data?.data?.summary

  const todayCamps = useMemo(() => camps.filter((c) => dayKey(new Date(c.date)) === todayKey), [camps, todayKey])
  const upcomingCamps = useMemo(
    () => camps.filter((c) => c.status === 'confirmed' && dayKey(new Date(c.date)) >= dayKey(addDays(new Date(), 1))).sort((a, b) => a.date.localeCompare(b.date)),
    [camps],
  )
  const pendingClosureCamps = useMemo(() => camps.filter((c) => isPendingClosure(c.date, c.status)), [camps])
  const closedThisMonth = useMemo(
    () => camps.filter((c) => c.status === 'closed' && c.date >= monthStart && c.date <= monthEnd),
    [camps, monthStart, monthEnd],
  )

  const myDevices = useMyInventoryAssignments('InventoryDevice')
  const deviceCount = myDevices.data?.data.count ?? 0

  const myConsumables = useMyInventoryAssignments('InventoryConsumable')
  const expiringConsumables = useMemo(() => {
    const items = myConsumables.data?.data.items ?? EMPTY_ARRAY
    const in30Days = addDays(new Date(), 30)
    return items.filter((a) => {
      const expiry = a.inventory.expiryDate
      return expiry && new Date(expiry) <= in30Days
    })
  }, [myConsumables.data])

  const bucketCamp = (key: 'confirmed' | 'live' | 'closed') => camps.find((c) => c.status === key)

  return (
    <div>
      <FopPageHeading title="Dashboard" subtitle="Command centre · today + upcoming + open issues + KPIs" />

      <QueryStateBlock
        isLoading={myCamps.isLoading}
        error={myCamps.error}
        loadingLabel="Loading dashboard…"
        errorLabel="Couldn't load your dashboard."
        onRetry={() => void myCamps.refetch()}
      >
        {pendingClosureCamps.length > 0 && (
          <FopAlert tone="red" icon={FiAlertTriangle}>
            {pendingClosureCamps.length} camp{pendingClosureCamps.length === 1 ? '' : 's'} need closure reports
          </FopAlert>
        )}

        <FopKpiGrid>
          <FopKpi
            label="Today's camps"
            value={todayCamps.length}
            sub={todayCamps.length ? `${todayCamps.length} scheduled` : 'Nothing scheduled'}
            icon={FiCalendar}
            tone={todayCamps.length ? 'green' : ''}
          />
          <FopKpi
            label="Upcoming"
            value={upcomingCamps.length}
            sub={upcomingCamps[0] ? `Next: ${new Date(upcomingCamps[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : '—'}
            icon={FiClock}
            tone="blue"
          />
          <FopKpi
            label="Pending closure"
            value={pendingClosureCamps.length}
            sub="Past camps without close-out"
            icon={FiFileText}
            tone={pendingClosureCamps.length ? 'red' : ''}
          />
          <FopKpi
            label="Inventory alerts"
            value={expiringConsumables.length}
            sub="Expiring within 30 days"
            icon={FiPackage}
            tone={expiringConsumables.length ? 'yellow' : 'green'}
          />
          <FopKpi label="Machines" value={deviceCount} sub="Currently allocated" icon={FiCpu} />
          <FopKpi label="Closed this month" value={closedThisMonth.length} sub={summary ? `${summary.totalCamps} total camps` : 'vs target'} icon={FiCheckCircle} />
        </FopKpiGrid>

        <FopCard>
          <FopCardHeader>
            <FiGrid size={14} /> Camps by status
          </FopCardHeader>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {BUCKET_META.map(({ key, label, icon: Icon }) => {
              const count = key === 'confirmed' ? upcomingCamps.length : camps.filter((c) => c.status === key).length
              const example = bucketCamp(key)
              return (
                <div
                  key={key}
                  className="rounded-[11px] p-2.5 text-left"
                  style={
                    count
                      ? { background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)', color: '#fff' }
                      : { background: 'var(--qms-surface)', color: 'var(--qms-text)', border: '1px solid var(--qms-border)' }
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-85 flex items-center gap-1">
                      <Icon size={12} /> {label}
                    </span>
                    <span className="text-[18px] font-extrabold">{count}</span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {example?.location?.city ? `${example.location.city} · ${new Date(example.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'None'}
                  </div>
                </div>
              )
            })}
            <div
              className="rounded-[11px] p-2.5 text-left"
              style={pendingClosureCamps.length ? { background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)', color: '#fff' } : { background: 'var(--qms-surface)', color: 'var(--qms-text)', border: '1px solid var(--qms-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold opacity-85 flex items-center gap-1">
                  <FiFileText size={12} /> Pending reports
                </span>
                <span className="text-[18px] font-extrabold">{pendingClosureCamps.length}</span>
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">
                {pendingClosureCamps[0]?.location?.city ? `${pendingClosureCamps[0].location.city} · ${new Date(pendingClosureCamps[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'None'}
              </div>
            </div>
          </div>
        </FopCard>
      </QueryStateBlock>
    </div>
  )
}

export default DashboardTab
