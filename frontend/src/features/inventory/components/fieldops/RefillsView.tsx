import { useMemo } from 'react'
import { FiPlus, FiCheck, FiX, FiTruck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import { holderName, holderKind } from '@/features/inventory/inventory.service'
import type { RefillRequest } from '@/features/inventory/inventory.types'
import type { Person } from '@/types/people.types'
import { sortByDateDesc } from '@/features/inventory/utils/sort'
import { RefillStatusPill, TableCard, Th, Td } from '@/features/inventory/components/fieldops/primitives'

// ── (A) Refills sub-view — exact port of viewRefills(). ────────────────────
const RefillsView = ({
  refills, people, onNew, onApprove, onReject, onDispatch,
}: {
  refills: RefillRequest[]
  people: Person[]
  onNew: () => void
  onApprove: (r: RefillRequest) => void
  onReject: (r: RefillRequest) => void
  onDispatch: (r: RefillRequest) => void
}) => {
  const list = useMemo(() => sortByDateDesc(refills), [refills])

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Refill requests · FO &amp; dietitian
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          Request → Inventory Manager approve → dispatch (transfer)
        </span>
        <Button className="ml-auto" onClick={onNew}>
          <FiPlus size={14} /> New refill
        </Button>
      </InvFilterBar>

      <TableCard minWidth={780}>
        <thead>
          <tr>
            <Th>Request</Th><Th>Holder</Th><Th>Item</Th><Th num>Qty</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <TableEmptyRow colSpan={7}>No refill requests.</TableEmptyRow>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <Td>
                  <b style={{ color: 'var(--qms-text)' }}>{r.id}</b>
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{r.date}</div>
                </Td>
                <Td>
                  {holderName(r.holder, people)}
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{holderKind(r.holder)}</div>
                </Td>
                <Td>{r.itemName}</Td>
                <Td num>{r.qty} {r.uom}</Td>
                <Td>{r.reason || '—'}</Td>
                <Td><RefillStatusPill status={r.status} /></Td>
                <Td nowrap>
                  {r.status === 'REQUESTED' && (
                    <>
                      <Button style={{ padding: '4px 9px' }} onClick={() => onApprove(r)}>
                        <FiCheck size={13} />
                      </Button>{' '}
                      <Button variant="ghost" style={{ padding: '4px 9px' }} onClick={() => onReject(r)}>
                        <FiX size={13} />
                      </Button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button style={{ padding: '4px 10px' }} onClick={() => onDispatch(r)}>
                      <FiTruck size={13} /> Dispatch
                    </Button>
                  )}
                  {r.status === 'DISPATCHED' && (
                    <span className="text-xs" style={{ color: '#059669' }}>transfer raised</span>
                  )}
                  {r.status === 'REJECTED' && <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>—</span>}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

export default RefillsView
