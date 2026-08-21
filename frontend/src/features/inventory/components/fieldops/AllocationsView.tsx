import { FiRefreshCw, FiAlertTriangle, FiShoppingBag, FiPlus } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import { useHolderHoldings } from '@/features/inventory/hooks/useInventory'
import { inr, inrShort } from '@/features/inventory/inventory.service'
import type { Holder } from '@/features/inventory/inventory.types'
import { BandPill, TableCard, Th, Td } from '@/features/inventory/components/fieldops/primitives'

// ── (C) Allocations sub-view — exact port of viewAlloc(). ──────────────────
const AllocationsView = ({
  holders, holder, onSetHolder, refreshKey, onRefill, onReport, onLocalProcure,
}: {
  holders: Holder[]
  holder: string
  onSetHolder: (h: string) => void
  refreshKey: unknown
  onRefill: (holder: string) => void
  onReport: (holder: string, itemId: string) => void
  onLocalProcure: (holder: string) => void
}) => {
  const hold = useHolderHoldings(holder, refreshKey)

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Allocations
        </span>
        <Select value={holder} onValueChange={(v) => onSetHolder(v ?? '')}>
          <SelectTrigger className="w-[220px] text-[12.5px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {holders.map((h) => <SelectItem key={h.code} value={h.code}>{h.kind} · {h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {inrShort(hold?.value ?? 0)} held
        </span>
        <Button variant="ghost" onClick={() => onLocalProcure(holder)}>
          <FiShoppingBag size={14} /> Local procurement
        </Button>
        <Button onClick={() => onRefill(holder)}>
          <FiPlus size={14} /> Refill
        </Button>
      </InvFilterBar>

      <TableCard minWidth={720}>
        <thead>
          <tr>
            <Th>Item</Th><Th>Batch</Th><Th num>On hand</Th><Th>Expiry</Th><Th num>Value</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {!hold || hold.consumables.length === 0 ? (
            <TableEmptyRow colSpan={6}>No stock allocated.</TableEmptyRow>
          ) : (
            hold.consumables.map((c) => (
              <tr key={c.item.id}>
                <Td>
                  <b style={{ color: 'var(--qms-text)' }}>{c.item.name}</b>
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{c.item.code || ''}</div>
                </Td>
                <Td>{c.item.batchNo || '—'}</Td>
                <Td num>{c.qty} {c.item.uom || ''}</Td>
                <Td>{c.band ? <BandPill css={c.band.css}>{c.band.label}</BandPill> : '—'}</Td>
                <Td num>{inr(c.value)}</Td>
                <Td nowrap>
                  <Button variant="ghost" style={{ padding: '4px 8px' }} title="Request refill" onClick={() => onRefill(holder)}>
                    <FiRefreshCw size={13} />
                  </Button>{' '}
                  <Button variant="ghost" style={{ padding: '4px 8px' }} title="Report wastage/damage/loss" onClick={() => onReport(holder, c.item.id)}>
                    <FiAlertTriangle size={13} />
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

export default AllocationsView
