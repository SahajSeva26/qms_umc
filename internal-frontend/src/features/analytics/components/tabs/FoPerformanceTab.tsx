import { useMemo } from 'react'
import { FiAward, FiMapPin, FiUsers, FiHome, FiCheckCircle, FiUserCheck } from 'react-icons/fi'
import type { AnalyticsFilters } from '@/types/analytics.types'
import { useFoAnalyticsAccess } from '@/features/analytics/hooks/useFoAnalyticsAccess'
import { useFoRoster } from '@/features/analytics/hooks/useFoRoster'
import { useFoCampSweep } from '@/features/analytics/hooks/useFoCampSweep'
import { useFoGeoProfileSweep } from '@/features/analytics/hooks/useFoGeoProfileSweep'
import { buildFoLeaderboard, buildFoRegionSpread } from '@/features/analytics/analytics.foStats'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import AnalyticsNotAvailable from '@/features/analytics/components/AnalyticsNotAvailable'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import KpiTile from '@/components/ui/KpiTile'

interface FoPerformanceTabProps {
  periodDays: AnalyticsFilters['periodDays']
}

// Occupancy %, efficiency %, and ★ rating are NOT wired — even the prototype hardcodes these as
// literal seed values; no backend field carries any of the three. Rendered as "-", not invented.
const FoPerformanceTab = ({ periodDays }: FoPerformanceTabProps) => {
  const { canViewFoRoster, canViewFoLeaderboard } = useFoAnalyticsAccess()

  const roster = useFoRoster(canViewFoRoster)
  const camps = useFoCampSweep(periodDays, canViewFoLeaderboard)
  const geoProfiles = useFoGeoProfileSweep(canViewFoLeaderboard)

  const leaderboard = useMemo(() => {
    if (!roster.data?.data || !camps.data) return []
    return buildFoLeaderboard(roster.data.data.fieldOfficers, camps.data)
  }, [roster.data, camps.data])

  const regionSpread = useMemo(() => {
    if (!geoProfiles.data || !camps.data) return []
    return buildFoRegionSpread(geoProfiles.data, camps.data)
  }, [geoProfiles.data, camps.data])

  const regionBars = regionSpread.map((r) => ({
    label: `${r.region} · ${r.fos} FO${r.fos === 1 ? '' : 's'}`,
    value: r.camps,
    formattedValue: String(r.camps),
  }))

  // Gated on the data actually being present, not merely permitted — else a loading/errored
  // leaderboard renders a false "0" instead of "-".
  const hasLeaderboardData = canViewFoLeaderboard && !!roster.data?.data && !!camps.data
  const totalFOs = canViewFoRoster ? roster.data?.data?.summary.totalFieldOfficers : undefined
  const totalCamps = hasLeaderboardData ? leaderboard.reduce((sum, r) => sum + r.camps, 0) : undefined
  const totalClosed = hasLeaderboardData ? leaderboard.reduce((sum, r) => sum + r.closed, 0) : undefined
  const totalPatients = hasLeaderboardData ? leaderboard.reduce((sum, r) => sum + r.patients, 0) : undefined

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KpiTile label="Active FOs" value={totalFOs !== undefined ? String(totalFOs) : '-'} sub="current" tone="brand" icon={FiUsers} />
        <KpiTile label="Camps" value={totalCamps !== undefined ? String(totalCamps) : '-'} sub="selected period" tone="teal" icon={FiHome} />
        <KpiTile label="Closed camps" value={totalClosed !== undefined ? String(totalClosed) : '-'} sub="selected period" tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Patients" value={totalPatients !== undefined ? String(totalPatients) : '-'} sub="selected period" tone="violet" icon={FiUserCheck} />
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <div className="md:col-span-2">
          <AnalyticsSectionCard
            icon={FiAward}
            iconGradient="linear-gradient(135deg, var(--qms-teal), var(--chart-1))"
            title="FO leaderboard"
            subtitle="Camps assigned and closed, by field officer — occupancy/efficiency/rating have no real backend source"
          >
            {!canViewFoRoster || !canViewFoLeaderboard ? (
              <AnalyticsNotAvailable reason="requires inventory-assignment:manage (roster) and camp:manage (camp data)" />
            ) : (
              <QueryStateBlock
                isLoading={roster.isLoading || camps.isLoading}
                error={roster.isError || camps.isError}
                loadingLabel="Loading FO leaderboard…"
                errorLabel="Failed to load FO leaderboard."
                onRetry={() => {
                  if (roster.isError) roster.refetch()
                  if (camps.isError) camps.refetch()
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                        {['FO', 'Code', 'Camps', 'Closed', 'Patients', 'Occ%', 'Eff%', '★'].map((h) => (
                          <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row) => (
                        <tr key={row.roleId} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.name}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{row.code}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.camps}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.closed}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.patients}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>-</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>-</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>-</td>
                        </tr>
                      ))}
                      {leaderboard.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                            No field officers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </QueryStateBlock>
            )}
          </AnalyticsSectionCard>
        </div>

        <div className="md:col-span-2">
          <AnalyticsSectionCard icon={FiMapPin} iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))" title="By region" subtitle="Camps per zonal region, by FO's registered location">
            {!canViewFoLeaderboard ? (
              <AnalyticsNotAvailable reason="requires camp:manage" />
            ) : (
              <QueryStateBlock
                isLoading={geoProfiles.isLoading || camps.isLoading}
                error={geoProfiles.isError || camps.isError}
                loadingLabel="Loading region spread…"
                errorLabel="Failed to load region spread."
                onRetry={() => {
                  if (geoProfiles.isError) geoProfiles.refetch()
                  if (camps.isError) camps.refetch()
                }}
              >
                <BarsHorizontal bars={regionBars} />
              </QueryStateBlock>
            )}
          </AnalyticsSectionCard>
        </div>
      </div>
    </div>
  )
}

export default FoPerformanceTab
