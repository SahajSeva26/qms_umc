import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { ProjectEntity } from '@/types/project.types'

interface ConvertProjectModalProps {
  open: boolean
  onClose: () => void
  eligibleProjects: ProjectEntity[]
  onConfirm: (projectId: string, manpower: { fo: number; coordinator: number; technician: number }, territory: { state: string; city: string; zone: string }) => void
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

  const handleConfirm = () => {
    if (!projectId) return
    onConfirm(projectId, { fo, coordinator, technician }, { state, city, zone })
    setProjectId(''); setFo(2); setCoordinator(1); setTechnician(0); setState(''); setCity(''); setZone('')
    onClose()
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
          <Button disabled={!projectId} onClick={handleConfirm}>Convert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConvertProjectModal
