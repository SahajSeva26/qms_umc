import { useMemo, useState } from 'react'
import { FiList, FiCalendar, FiArchive } from 'react-icons/fi'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import FopCampRow from '@/features/fieldWorkspace/components/FopCampRow'
import { FopPageHeading, FopCard, FopEmpty, FopCta } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { dayKey } from '@/utils/calendarDate'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

type ScheduleView = 'list' | 'calendar' | 'past'

// Mirrors the prototype's Camp Schedule tab — "calendar" is rendered as a date-grouped list
// here (same real data, no separate grid component exists yet for this tab).
const CampScheduleTab = () => {
  const [view, setView] = useState<ScheduleView>('list')
  const todayKey = dayKey(new Date())

  const upcomingQuery = useMyCamps({ dateFrom: todayKey, limit: '200' }, view !== 'past')
  const pastQuery = useMyCamps({ dateTo: todayKey, status: 'closed', limit: '200' }, view === 'past')

  const active = view === 'past' ? pastQuery : upcomingQuery
  const camps = useMemo(() => {
    const items = active.data?.data?.items ?? EMPTY_ARRAY
    return [...items].sort((a, b) => (view === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
  }, [active.data, view])

  return (
    <div>
      <FopPageHeading title="Camp Schedule" subtitle="My assigned camps · list & past camps" />

      <FopCard style={{ padding: 8, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <FopCta tone={view === 'list' ? 'primary' : 'ghost'} sm onClick={() => setView('list')}>
          <FiList size={13} /> List
        </FopCta>
        <FopCta tone={view === 'calendar' ? 'primary' : 'ghost'} sm onClick={() => setView('calendar')}>
          <FiCalendar size={13} /> Calendar
        </FopCta>
        <FopCta tone={view === 'past' ? 'primary' : 'ghost'} sm onClick={() => setView('past')}>
          <FiArchive size={13} /> Past
        </FopCta>
      </FopCard>

      <FopCard>
        <QueryStateBlock
          isLoading={active.isLoading}
          error={active.error}
          loadingLabel="Loading camps…"
          errorLabel="Couldn't load your camps."
          onRetry={() => void active.refetch()}
        >
          {camps.length === 0 ? (
            <FopEmpty icon={FiCalendar} label="No camps scheduled" />
          ) : (
            camps.map((camp) => <FopCampRow key={camp.id} camp={camp} />)
          )}
        </QueryStateBlock>
      </FopCard>
    </div>
  )
}

export default CampScheduleTab
