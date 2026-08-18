import { useMemo, useState } from 'react'
import { FiHome, FiNavigation2, FiWatch as FiApple, FiTruck, FiRepeat } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { useWarehouse, useWarehouseNetwork } from '@/features/inventory/hooks/useInventory'
import { inr, inrShort, locOptions, locLabel } from '@/features/inventory/inventory.service'
import type { NewTransferInput } from '@/features/inventory/inventory.service'
import type { WarehouseLocCode } from '@/features/inventory/inventory.types'
import { transferSchema } from '@/features/inventory/schemas/transfer.schema'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import { NewTransferModal } from '@/features/inventory/components/NewTransferModal'

// One central warehouse (authoritative stock); FO/Dietitian/In-transit are derived valuations, not separately-editable stores.
const WarehouseTab = () => {
  const warehouse = useWarehouse()
  const { people, dietitians, transfers, saveTransfer } = warehouse
  const network = useWarehouseNetwork(warehouse)

  // Toggling a location card only sets its active visual state — it does not filter the stock table below.
  const [locFilter, setLocFilter] = useState<WarehouseLocCode | 'ALL'>('ALL')
  const [transferOpen, setTransferOpen] = useState(false)

  const lowN = useMemo(
    () => network.stock.filter((it) => (it.qtyOnHand || 0) <= (it.reorderLevel || 0)).length,
    [network.stock],
  )
  const inTransitCount = useMemo(() => transfers.filter((t) => t.status === 'IN_TRANSIT').length, [transfers])

  const toggleLoc = (code: WarehouseLocCode) => setLocFilter((cur) => (cur === code ? 'ALL' : code))

  const handleCreateTransfer = async (input: NewTransferInput) => {
    const result = transferSchema.safeParse(input)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    const t = await saveTransfer(input)
    setTransferOpen(false)
    toast.success(`Transfer raised · ${locLabel(input.from, people)} → ${locLabel(input.to, people)}`)
    void t
  }

  return (
    <div>
      <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-2.5 mb-3.5">
        <LocCard
          active={locFilter === 'CENTRAL'}
          icon={<FiHome size={13} />}
          color="var(--qms-brand)"
          label="Central WH · HO"
          value={inrShort(network.central)}
          sub={`${network.stock.length} SKUs in bulk`}
          onClick={() => toggleLoc('CENTRAL')}
        />
        <LocCard
          active={locFilter === 'FO'}
          icon={<FiNavigation2 size={13} />}
          color="var(--qms-teal)"
          label="FO field stock"
          value={inrShort(network.foVal)}
          sub={`${network.fos.length} field officers`}
          onClick={() => toggleLoc('FO')}
        />
        <LocCard
          active={locFilter === 'DIET'}
          icon={<FiApple size={13} />}
          color="#10b981"
          label="Dietitian stock"
          value={inrShort(network.dietVal)}
          sub={`${dietitians.length} dietitians`}
          onClick={() => toggleLoc('DIET')}
        />
        <LocCard
          active={locFilter === 'TRANSIT'}
          icon={<FiTruck size={13} />}
          color="#f59e0b"
          label="In-transit"
          value={inrShort(network.transit)}
          sub={`${inTransitCount} shipments`}
          onClick={() => toggleLoc('TRANSIT')}
        />
      </div>

      <InvFilterBar>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.04em]"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          <FiHome size={13} /> Central Warehouse · Head Office
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {network.stock.length} SKUs · {inrShort(network.central)} bulk value · {lowN} below reorder
        </span>
        <Button onClick={() => setTransferOpen(true)}>
          <FiRepeat size={14} /> New transfer
        </Button>
      </InvFilterBar>

      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              {['Code', 'Item', 'Type', 'Central on hand', 'Reorder', 'Value', 'Status'].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase tracking-[.04em] ${i >= 3 && i <= 5 ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {network.stock.length === 0 ? (
              <TableEmptyRow colSpan={7}>No stock items.</TableEmptyRow>
            ) : (
              network.stock.map((it) => {
                const value = (it.qtyOnHand || 0) * (it.purchaseCost || 0)
                const low = (it.qtyOnHand || 0) <= (it.reorderLevel || 0)
                return (
                  <tr
                    key={it.id}
                    className="cursor-pointer hover:bg-[rgba(59,109,255,.03)]"
                    onClick={() => openItemMasterDrawer(it.id)}
                  >
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <b style={{ color: 'var(--qms-text)' }}>{it.code || '—'}</b>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.name}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{it.itemType}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.qtyOnHand ?? 0} {it.uom || ''}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.reorderLevel ?? '—'}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(value)}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      {low ? (
                        <StatusPill bg="rgba(245,158,11,.16)" fg="#b45309" label="Below reorder" />
                      ) : (
                        <StatusPill bg="rgba(16,185,129,.15)" fg="#059669" label="OK" />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <NewTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        items={network.stock}
        locs={locOptions(people)}
        onSave={handleCreateTransfer}
        submitIcon={<FiRepeat size={13} />}
      />
    </div>
  )
}

function openItemMasterDrawer(itemId: string): void {
  // TODO: wire to the Item Master drawer once that feature is built.
  void itemId
}

function LocCard({
  active, icon, color, label, value, sub, onClick,
}: {
  active: boolean
  icon: React.ReactNode
  color: string
  label: string
  value: string
  sub: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer transition-[border-color,transform] duration-150 hover:-translate-y-0.5"
      style={{
        padding: '13px 14px',
        borderRadius: 12,
        background: 'var(--qms-surface)',
        border: `1px solid ${active ? color : 'var(--qms-border)'}`,
        boxShadow: active ? `inset 0 0 0 1px ${color}` : 'none',
      }}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.03em]" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="grid place-items-center text-white" style={{ width: 24, height: 24, borderRadius: 7, background: color }}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1.5 font-extrabold" style={{ fontSize: 20, color: 'var(--qms-text)' }}>{value}</div>
      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
    </div>
  )
}

function StatusPill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: bg, color: fg }}
    >
      {label}
    </span>
  )
}

export default WarehouseTab
