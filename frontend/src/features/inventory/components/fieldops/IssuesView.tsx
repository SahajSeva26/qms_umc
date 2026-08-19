import { useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import { inrShort, holderName, holderKind, itemById } from '@/features/inventory/inventory.service'
import type { FieldReport } from '@/features/inventory/inventory.types'
import type { Person } from '@/types/people.types'
import { sortByDateDesc } from '@/features/inventory/utils/sort'
import { IssueTypePill, TableCard, Th, Td } from '@/features/inventory/components/fieldops/primitives'

// ── (B) Issues sub-view — exact port of viewIssues(). ──────────────────────
const IssuesView = ({
  reports, people, onNew,
}: {
  reports: FieldReport[]
  people: Person[]
  onNew: () => void
}) => {
  const list = useMemo(() => sortByDateDesc(reports), [reports])
  const lossValue = useMemo(() => {
    return list
      .filter((r) => r.type === 'WASTAGE' || r.type === 'DAMAGE' || r.type === 'LOSS' || r.type === 'EXPIRY')
      .reduce((a, r) => {
        const it = itemById(r.itemId)
        return a + (r.qty || 0) * (it?.purchaseCost || 0)
      }, 0)
  }, [list])

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Field reports
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          Wastage · damage · loss · expiry · consumption · return · {inrShort(lossValue)} loss value
        </span>
        <Button className="ml-auto" onClick={onNew}>
          <FiPlus size={14} /> New report
        </Button>
      </InvFilterBar>

      <TableCard minWidth={760}>
        <thead>
          <tr>
            <Th>Report</Th><Th>Holder</Th><Th>Item</Th><Th num>Qty</Th><Th>Type</Th><Th>Reason</Th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <TableEmptyRow colSpan={6}>No reports.</TableEmptyRow>
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
                <Td><IssueTypePill type={r.type} /></Td>
                <Td>{r.reason || '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

export default IssuesView
