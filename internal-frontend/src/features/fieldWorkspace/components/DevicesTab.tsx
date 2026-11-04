import { useMemo } from 'react'
import { FiCpu, FiCheckCircle, FiActivity } from 'react-icons/fi'
import { useMyInventoryAssignments } from '@/features/fieldWorkspace/hooks/useMyInventoryAssignments'
import { FopPageHeading, FopKpiGrid, FopKpi, FopCard, FopCardHeader, FopTable, FopPill, type FopPillTone } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Matches the real backend enum exactly (inventory-device.constants.ts), including its
// "maintainance"/"damaged" spelling — not re-corrected here, since the value must match the wire.
const STATUS_TONE: Record<string, FopPillTone> = {
  available: 'blue',
  'in-transit': 'amber',
  assigned: 'green',
  maintainance: 'amber',
  lost: 'red',
  damaged: 'red',
}

// Mirrors the prototype's Devices & Machines tab. Known gap: no "faulty" boolean exists on the
// real InventoryDevice model (only `status`) and the prototype's "Report" action routes into the
// unbuilt Incident/SOS flow — both dropped, not stubbed.
const DevicesTab = () => {
  const devices = useMyInventoryAssignments('InventoryDevice')
  const items = devices.data?.data.items ?? EMPTY_ARRAY

  const workingCount = useMemo(() => items.filter((a) => a.inventory.status === 'assigned').length, [items])

  return (
    <div>
      <FopPageHeading title="Devices & Machines" subtitle="Allocated to me · status" />

      <QueryStateBlock
        isLoading={devices.isLoading}
        error={devices.error}
        loadingLabel="Loading devices…"
        errorLabel="Couldn't load your devices."
        onRetry={() => void devices.refetch()}
      >
        <FopKpiGrid>
          <FopKpi label="Allocated" value={items.length} sub="Currently assigned" icon={FiCpu} />
          <FopKpi label="Working" value={workingCount} sub="In use" icon={FiCheckCircle} tone="green" />
        </FopKpiGrid>

        <FopCard>
          <FopCardHeader>
            <FiActivity size={14} /> My machines
          </FopCardHeader>
          <FopTable>
            <thead>
              <tr>
                <Th>Serial</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <Td><b>{a.inventory.serialNumber ?? a.inventory.id}</b></Td>
                  <Td><FopPill tone={STATUS_TONE[a.inventory.status ?? ''] ?? 'grey'}>{(a.inventory.status ?? 'unknown').toUpperCase()}</FopPill></Td>
                </tr>
              ))}
            </tbody>
          </FopTable>
        </FopCard>
      </QueryStateBlock>
    </div>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="py-2 px-1.5 text-left text-[10px] font-extrabold uppercase tracking-wide border-b border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>{children}</th>
)
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="py-2 px-1.5 border-b border-dashed" style={{ borderColor: 'var(--qms-border)' }}>{children}</td>
)

export default DevicesTab
