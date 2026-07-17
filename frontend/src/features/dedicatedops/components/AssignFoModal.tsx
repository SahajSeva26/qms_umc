import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Person } from '@/types/people.types'
import type { Doctor } from '@/types/camp.types'
import type { Assignment, ScheduleType } from '@/features/dedicatedops/dedicatedops.types'

interface AssignFoModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  fos: Person[]
  doctors: Doctor[]
  assignments: Record<string, Assignment>
  onConfirm: (args: { foId: string; doctorId: string; clinicLabel: string; startDate: string; scheduleType: ScheduleType }) => void
}

const SCHEDULE_OPTIONS: { id: ScheduleType; label: string }[] = [
  { id: 'mon-sat', label: 'Mon–Sat' },
  { id: 'daily', label: 'Daily' },
  { id: 'mon-fri', label: 'Mon–Fri' },
  { id: 'alternate', label: 'Alternate days' },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Mirrors doAssignFo/doConfirmAssign — "currently on X" hint is informational
// only, not a blocking constraint (dedicated-ops.js:215-254): re-assigning an
// FO already on another project silently overwrites the prior assignment.
const AssignFoModal = ({ open, onClose, projectId, fos, doctors, assignments, onConfirm }: AssignFoModalProps) => {
  const [foId, setFoId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [clinicLabel, setClinicLabel] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [scheduleType, setScheduleType] = useState<ScheduleType>('mon-sat')

  const handleConfirm = () => {
    if (!foId) return
    onConfirm({ foId, doctorId, clinicLabel, startDate, scheduleType })
    setFoId(''); setDoctorId(''); setClinicLabel(''); setStartDate(todayIso()); setScheduleType('mon-sat')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign FO — {projectId}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer</label>
            <Select value={foId} onValueChange={(v) => setFoId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select FO" /></SelectTrigger>
              <SelectContent>
                {fos.map((f) => {
                  const existing = assignments[f.id]
                  return (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}{existing && existing.projectId !== projectId ? ` — currently on ${existing.projectId}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor / clinic</label>
            <Select value={doctorId} onValueChange={(v) => setDoctorId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialty}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Clinic label</label>
            <Input value={clinicLabel} onChange={(e) => setClinicLabel(e.target.value)} placeholder="e.g. Dr Sharma · Cardiology Clinic" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Schedule</label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!foId} onClick={handleConfirm}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssignFoModal
