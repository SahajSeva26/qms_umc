import { useMemo, useState } from 'react'
import { FiRefreshCw, FiAlertTriangle, FiBox } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import {
  useFieldOps, useHolders, useFieldOpsSegment, useFieldOpsHolder,
} from '@/features/inventory/hooks/useInventory'
import { holderName } from '@/features/inventory/inventory.service'
import type { NewRefillInput, NewReportInput, NewLocalProcureInput } from '@/features/inventory/inventory.service'
import type { RefillRequest } from '@/features/inventory/inventory.types'
import { SegButton } from '@/features/inventory/components/fieldops/primitives'
import RefillsView from '@/features/inventory/components/fieldops/RefillsView'
import IssuesView from '@/features/inventory/components/fieldops/IssuesView'
import AllocationsView from '@/features/inventory/components/fieldops/AllocationsView'
import NewRefillModal from '@/features/inventory/components/fieldops/NewRefillModal'
import ReportStockModal from '@/features/inventory/components/fieldops/ReportStockModal'
import LocalProcureModal from '@/features/inventory/components/fieldops/LocalProcureModal'

// 3-way segmented control (Refills / Issues / Allocations); Field Ops owns
// writing to the shared allocations ledger, other tabs only read it.
const FieldOpsTab = () => {
  const data = useFieldOps()
  const {
    units, people, refills, reports, isLoading,
    approveRefill, rejectRefill, dispatchRefill, saveRefill, saveReport, saveLocalProcure,
  } = data
  const { seg, setSeg } = useFieldOpsSegment()
  const { holder, setHolder } = useFieldOpsHolder()
  const hs = useHolders(people)

  const [refillOpen, setRefillOpen] = useState(false)
  const [refillPreset, setRefillPreset] = useState<string | undefined>(undefined)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPreset, setReportPreset] = useState<{ holder?: string; itemId?: string }>({})
  const [localProcureOpen, setLocalProcureOpen] = useState(false)
  const [localProcurePreset, setLocalProcurePreset] = useState<string | undefined>(undefined)

  const activeHolder = holder || hs[0]?.code || ''

  const pendingRefills = useMemo(() => refills.filter((r) => r.status === 'REQUESTED').length, [refills])

  const openRefill = (presetHolder?: string) => {
    setRefillPreset(presetHolder)
    setRefillOpen(true)
  }
  const openReport = (presetHolder?: string, presetItem?: string) => {
    setReportPreset({ holder: presetHolder, itemId: presetItem })
    setReportOpen(true)
  }
  const openLocalProcure = (presetHolder?: string) => {
    setLocalProcurePreset(presetHolder)
    setLocalProcureOpen(true)
  }

  const handleApprove = async (r: RefillRequest) => {
    await approveRefill(r.id)
    toast.success(`${r.id} approved`)
  }
  const handleReject = async (r: RefillRequest) => {
    await rejectRefill(r.id)
    toast.error(`${r.id} rejected`)
  }
  const handleDispatch = async (r: RefillRequest) => {
    await dispatchRefill(r.id)
    toast.success(`${r.id} → transfer drafted to ${holderName(r.holder, people)}`)
  }

  const handleSaveRefill = async (input: NewRefillInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveRefill(input)
    setRefillOpen(false)
    setSeg('refills')
    toast.success(`Refill requested for ${holderName(input.holder, people)}`)
  }

  const handleSaveReport = async (input: NewReportInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveReport(input)
    setReportOpen(false)
    setSeg('issues')
    toast[input.type === 'RETURN' ? 'success' : 'info'](`${input.type} logged · ${input.qty} off ${holderName(input.holder, people)}`)
  }

  const handleSaveLocalProcure = async (input: NewLocalProcureInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveLocalProcure(input)
    setLocalProcureOpen(false)
    toast.success(`Local procurement added to ${holderName(input.holder, people)}`)
  }

  if (isLoading) {
    return (
      <div className="text-center" style={{ padding: 48, color: 'var(--qms-text-muted)' }}>
        Loading field ops…
      </div>
    )
  }

  return (
    <div>
      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-3.5"
        style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
      >
        <SegButton active={seg === 'refills'} onClick={() => setSeg('refills')} icon={<FiRefreshCw size={13} />}>
          Refill requests{pendingRefills ? ` (${pendingRefills})` : ''}
        </SegButton>
        <SegButton active={seg === 'issues'} onClick={() => setSeg('issues')} icon={<FiAlertTriangle size={13} />}>
          Wastage / Damage / Loss
        </SegButton>
        <SegButton active={seg === 'alloc'} onClick={() => setSeg('alloc')} icon={<FiBox size={13} />}>
          Allocations
        </SegButton>
      </div>

      {seg === 'refills' && (
        <RefillsView
          refills={refills}
          people={people}
          onNew={() => openRefill()}
          onApprove={handleApprove}
          onReject={handleReject}
          onDispatch={handleDispatch}
        />
      )}

      {seg === 'issues' && (
        <IssuesView reports={reports} people={people} onNew={() => openReport()} />
      )}

      {seg === 'alloc' && (
        <AllocationsView
          holders={hs}
          holder={activeHolder}
          onSetHolder={setHolder}
          refreshKey={[refills, reports]}
          onRefill={(h) => openRefill(h)}
          onReport={(h, itemId) => openReport(h, itemId)}
          onLocalProcure={(h) => openLocalProcure(h)}
        />
      )}

      <NewRefillModal
        open={refillOpen}
        onClose={() => setRefillOpen(false)}
        holders={hs}
        presetHolder={refillPreset}
        onSave={handleSaveRefill}
      />
      <ReportStockModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        holders={hs}
        presetHolder={reportPreset.holder}
        presetItem={reportPreset.itemId}
        onSave={handleSaveReport}
      />
      <LocalProcureModal
        open={localProcureOpen}
        onClose={() => setLocalProcureOpen(false)}
        holders={hs}
        presetHolder={localProcurePreset}
        onSave={handleSaveLocalProcure}
      />

      <span className="hidden">{units.length}</span>
    </div>
  )
}

export default FieldOpsTab
