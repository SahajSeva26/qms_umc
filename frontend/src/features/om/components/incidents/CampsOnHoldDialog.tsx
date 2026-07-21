import { FiAlertOctagon } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Camp } from '@/types/camp.types'
import type { MachineFlag } from '@/features/fo/fo.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { fmtDt } from './incidents.ui'

interface CampsOnHoldDialogProps {
  open: boolean
  camps: Camp[]
  flags: MachineFlag[]
  devices: DeviceCatalogItem[]
  onClose: () => void
  onSuggestReplacement: (deviceId: string, campId: string) => void
}

// Camps on hold — mirrors machine-replacement.js's QMS_openMachineHoldsList():
// every camp whose devicesAllocated includes a currently-faulty device, with
// a "Suggest replacement" action per flagged device. The prototype derives
// "on hold" purely from device-fault-flag membership (QMS_isCampOnHold), not
// a separate stored flag — this mirrors that by cross-referencing
// camp.devicesAllocated against the live machine-flags list.
const CampsOnHoldDialog = ({ open, camps, flags, devices, onClose, onSuggestReplacement }: CampsOnHoldDialogProps) => {
  const faultyIds = new Set(flags.filter((f) => f.faulty && !f.clearedAt).map((f) => f.deviceId))

  const onHold = camps
    .map((camp) => {
      const faultyDevices = (camp.devicesAllocated ?? []).filter((id) => faultyIds.has(id))
      return faultyDevices.length > 0 ? { camp, faultyDevices } : null
    })
    .filter((x): x is { camp: Camp; faultyDevices: string[] } => x !== null)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Camps on hold · faulty machines</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            {onHold.length} camp{onHold.length === 1 ? '' : 's'} waiting for replacement assignment
          </p>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {onHold.map(({ camp, faultyDevices }) => (
            <div key={camp.id} className="rounded-lg border p-3 flex items-start justify-between gap-3" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="min-w-0">
                <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.id} · {camp.city} · {camp.type}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.date?.slice(0, 10)} · FO {camp.foName || '—'}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {faultyDevices.map((deviceId) => {
                    const d = devices.find((x) => x.id === deviceId)
                    return (
                      <span key={deviceId} className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        ⚠ {d?.name ?? deviceId}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                {faultyDevices.map((deviceId) => (
                  <Button key={deviceId} size="sm" onClick={() => onSuggestReplacement(deviceId, camp.id)}>
                    <FiAlertOctagon size={12} /> Suggest replacement
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {onHold.length === 0 && (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No camps on hold · all good.</div>
          )}
        </div>
        <div className="text-[10.5px] pt-1" style={{ color: 'var(--qms-text-muted)' }}>Last checked {fmtDt(new Date().toISOString())}</div>
      </DialogContent>
    </Dialog>
  )
}

export default CampsOnHoldDialog
