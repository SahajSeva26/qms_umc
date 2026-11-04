import { useMemo } from 'react'
import { FiPackage, FiDroplet, FiXCircle, FiZap } from 'react-icons/fi'
import { useMyInventoryAssignments } from '@/features/fieldWorkspace/hooks/useMyInventoryAssignments'
import { FopPageHeading, FopKpiGrid, FopKpi, FopCard, FopCardHeader, FopPill, FopTable, type FopPillTone } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { addDays } from '@/utils/calendarDate'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const EXPIRY_WINDOW_DAYS = 30

function expiryTone(expiryDate: string | undefined): { tone: FopPillTone; label: string } {
  if (!expiryDate) return { tone: 'grey', label: '—' }
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { tone: 'red', label: 'EXPIRED' }
  if (days < EXPIRY_WINDOW_DAYS) return { tone: 'amber', label: `${days}d` }
  return { tone: 'green', label: 'OK' }
}

// Mirrors the prototype's Inventory tab. Known gap: the assignment endpoint doesn't populate the
// catalog item name (InventoryMaster), only batch/expiry/serial — the "Item" column shows the
// lot's own id, not a human item name, until a second lookup is justified.
const InventoryTab = () => {
  const consumables = useMyInventoryAssignments('InventoryConsumable')
  const items = consumables.data?.data.items ?? EMPTY_ARRAY

  const in30Days = addDays(new Date(), EXPIRY_WINDOW_DAYS)
  const expiringSoon = useMemo(
    () => items.filter((a) => a.inventory.expiryDate && new Date(a.inventory.expiryDate) <= in30Days && new Date(a.inventory.expiryDate) >= new Date()),
    [items, in30Days],
  )
  const expired = useMemo(() => items.filter((a) => a.inventory.expiryDate && new Date(a.inventory.expiryDate) < new Date()), [items])

  const fifoSorted = useMemo(
    () => [...items].filter((a) => a.inventory.expiryDate).sort((a, b) => (a.inventory.expiryDate ?? '').localeCompare(b.inventory.expiryDate ?? '')).slice(0, 5),
    [items],
  )

  return (
    <div>
      <FopPageHeading title="Inventory" subtitle="Consumables · lots · FIFO suggestions" />

      <QueryStateBlock
        isLoading={consumables.isLoading}
        error={consumables.error}
        loadingLabel="Loading inventory…"
        errorLabel="Couldn't load your inventory."
        onRetry={() => void consumables.refetch()}
      >
        <FopKpiGrid>
          <FopKpi label="Total items" value={items.length} sub="Lots assigned to me" icon={FiPackage} />
          <FopKpi label="Expiring soon" value={expiringSoon.length} sub={`< ${EXPIRY_WINDOW_DAYS}d`} icon={FiDroplet} tone={expiringSoon.length ? 'yellow' : ''} />
          <FopKpi label="Expired" value={expired.length} sub="Quarantine!" icon={FiXCircle} tone={expired.length ? 'red' : ''} />
        </FopKpiGrid>

        <FopCard>
          <FopCardHeader>
            <FiZap size={14} /> FIFO suggestion · use these first
          </FopCardHeader>
          <FopTable>
            <thead>
              <tr>
                <Th>Lot</Th>
                <Th>Expiry</Th>
                <Th>Qty</Th>
              </tr>
            </thead>
            <tbody>
              {fifoSorted.map((a) => {
                const { tone, label } = expiryTone(a.inventory.expiryDate)
                return (
                  <tr key={a.id}>
                    <Td><b>{a.inventory.batch ?? a.inventory.id}</b></Td>
                    <Td>
                      <FopPill tone={tone}>{label}</FopPill>
                      {a.inventory.expiryDate && <span className="ml-1.5" style={{ color: 'var(--qms-text-muted)' }}>{new Date(a.inventory.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                    </Td>
                    <Td>{a.quantity}</Td>
                  </tr>
                )
              })}
            </tbody>
          </FopTable>
        </FopCard>

        <FopCard>
          <FopCardHeader>Full inventory</FopCardHeader>
          <FopTable>
            <thead>
              <tr>
                <Th>Lot</Th>
                <Th>Expiry</Th>
                <Th>Qty</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const { tone, label } = expiryTone(a.inventory.expiryDate)
                return (
                  <tr key={a.id}>
                    <Td><b>{a.inventory.batch ?? a.inventory.id}</b></Td>
                    <Td>{a.inventory.expiryDate ? new Date(a.inventory.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Td>
                    <Td>{a.quantity}</Td>
                    <Td><FopPill tone={tone}>{label}</FopPill></Td>
                  </tr>
                )
              })}
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

export default InventoryTab
