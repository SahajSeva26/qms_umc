import { useNavigate } from 'react-router-dom'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.routes'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'

// Mirrors `@/features/access-management/role/components/RolesTable.tsx` exactly.
const TYPE_LABEL: Record<GeoProfileEntity['type'], string> = {
  fo: 'Field Officer',
  dietitian: 'Dietitian',
}

interface GeoProfilesTableProps {
  geoProfiles: GeoProfileEntity[]
}

const GeoProfilesTable = ({ geoProfiles }: GeoProfilesTableProps) => {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Role
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Type
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Coordinates
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Coverage radius
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {geoProfiles.map((profile) => (
              <tr
                key={profile.id}
                onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILE_DETAIL.replace(':id', profile.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold font-mono truncate" style={{ color: 'var(--qms-text)' }}>
                    {profile.role}
                  </span>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {TYPE_LABEL[profile.type] ?? profile.type}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {profile.coordinates.length === 2 ? `${profile.coordinates[1]}, ${profile.coordinates[0]}` : '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {(profile.coverageRadius / 1000).toLocaleString()} km
                </td>
                <td className="px-4 py-2.5">
                  <GeoProfileStatusPill status={profile.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {geoProfiles.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No geo profiles found.
        </div>
      )}
    </div>
  )
}

export default GeoProfilesTable
