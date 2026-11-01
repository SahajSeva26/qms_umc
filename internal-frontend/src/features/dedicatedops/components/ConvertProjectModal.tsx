import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import type { ProjectEntity } from '@/types/project.types'

interface ConvertProjectModalProps {
  open: boolean
  onClose: () => void
  eligibleProjects: ProjectEntity[]
  /** Returns the mutation's promise so this modal can await it — see handleConfirm. */
  onConfirm: (projectId: string, manpower: { fo: number; coordinator: number; technician: number }, territory: { state: string; city: string; zone: string }) => Promise<unknown>
}

// Mirrors the prototype's doConvertProject/doConfirmConvert flow exactly —
// only pid is required, no other validation (dedicated-ops.js:103-143).
const ConvertProjectModal = ({ open, onClose, eligibleProjects, onConfirm }: ConvertProjectModalProps) => {
  const [projectId, setProjectId] = useState('')
  const [fo, setFo] = useState(2)
  const [coordinator, setCoordinator] = useState(1)
  const [technician, setTechnician] = useState(0)
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [zone, setZone] = useState('')
  const [saving, setSaving] = useState(false)

  // Awaits the mutation before resetting/closing — a failed conversion must
  // leave the form exactly as the user left it, not vanish as if it had
  // succeeded.
  const handleConfirm = async () => {
    if (!projectId) return
    setSaving(true)
    try {
      await onConfirm(projectId, { fo, coordinator, technician }, { state, city, zone })
      setProjectId(''); setFo(2); setCoordinator(1); setTechnician(0); setState(''); setCity(''); setZone('')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not convert the project — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Convert project to Dedicated</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Project</label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {eligibleProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>FOs required</label>
            <Input type="number" min={1} value={fo} onChange={(e) => setFo(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Coordinators</label>
            <Input type="number" min={0} value={coordinator} onChange={(e) => setCoordinator(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Technicians</label>
            <Input type="number" min={0} value={technician} onChange={(e) => setTechnician(Number(e.target.value))} />
          </div>
          <div />
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Zone</label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!projectId || saving} onClick={handleConfirm}>Convert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConvertProjectModal
