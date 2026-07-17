import { FiCpu, FiAlertCircle, FiPackage } from 'react-icons/fi'
import { usePeopleData } from '@/hooks/usePeopleData'
import KpiTile from '@/components/ui/KpiTile'
import DoBar from '@/features/dedicatedops/components/DoBar'
import type { Dietitian } from '@/features/diet/diet.types'

interface DevicesTabProps {
  dietitians: Dietitian[]
}

// Mirrors tabDevices() exactly (diet-camps.js:1061-1148) — only considers
// ACTIVE dietitians, tallies assignment-count per device id, sorted desc.
const DevicesTab = ({ dietitians }: DevicesTabProps) => {
  const { devices } = usePeopleData()
  const active = dietitians.filter((d) => d.status === 'ACTIVE')
  const withDevice = active.filter((d) => d.machinesAssigned.length > 0).length
  const withoutDevice = active.length - withDevice
  const totalHandovers = active.reduce((sum, d) => sum + d.machinesAssigned.length, 0)

  const usage = devices.map((dev) => {
    const count = active.filter((d) => d.machinesAssigned.includes(dev.id)).length
    return { device: dev, count, pct: active.length ? Math.round((count / active.length) * 100) : 0 }
  }).filter((u) => u.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="With device" value={String(withDevice)} tone="emerald" icon={FiCpu} />
        <KpiTile label="Without device" value={String(withoutDevice)} tone="rose" icon={FiAlertCircle} />
        <KpiTile label="Total handovers" value={String(totalHandovers)} tone="brand" icon={FiPackage} />
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        {usage.map((u) => (
          <div key={u.device.id}>
            <div className="flex justify-between text-[12px] mb-1">
              <span style={{ color: 'var(--qms-text)' }}>{u.device.name}</span>
              <span style={{ color: 'var(--qms-text-muted)' }}>{u.count}/{active.length} dietitians</span>
            </div>
            <DoBar pct={u.pct} color="#8b5cf6" />
          </div>
        ))}
        {usage.length === 0 && (
          <p className="text-[13px] text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>No devices assigned yet.</p>
        )}
      </div>
    </div>
  )
}

export default DevicesTab
