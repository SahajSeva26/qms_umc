import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select'
import { usePeopleData } from '@/hooks/usePeopleData'
import type { Camp } from '@/types/camp.types'
import type { Dietitian } from '@/features/diet/diet.types'

interface AssignTeamModalProps {
  open: boolean
  camp: Camp
  dietitians: Dietitian[]
  onClose: () => void
  onConfirm: (dietitianId: string, foId: string) => void
}

// Mirrors dcAssignTeam's fallback inline modal (diet-camps.js:1820-1936) —
// state/city match is advisory (falls through if either side blank),
// grouped preferred (matchingDts) vs other-locations optgroups.
const AssignTeamModal = ({ open, camp, dietitians, onClose, onConfirm }: AssignTeamModalProps) => {
  const { people: fos } = usePeopleData('Field Officer')
  const [dietitianId, setDietitianId] = useState('')
  const [foId, setFoId] = useState('')

  const active = dietitians.filter((d) => d.status === 'ACTIVE')
  const matching = useMemo(
    () => active.filter((d) => (!camp.state || !d.state || d.state === camp.state) && (!camp.city || !d.city || d.city === camp.city)),
    [active, camp.state, camp.city]
  )
  const others = active.filter((d) => !matching.includes(d))

  const handleConfirm = () => {
    if (!dietitianId && !window.confirm('No dietitian selected — assign FO only?')) return
    onConfirm(dietitianId, foId)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign team — {camp.id}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Dietitian</label>
            <Select value={dietitianId} onValueChange={(v) => setDietitianId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select dietitian" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Preferred (state/city match)</SelectLabel>
                  {matching.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.city}</SelectItem>)}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Other locations</SelectLabel>
                  {others.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.city}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer (coordination)</label>
            <Select value={foId} onValueChange={(v) => setFoId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {fos.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssignTeamModal
