import { useState } from 'react'
import { FiInfo } from 'react-icons/fi'
import type { LeaveType } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface ApplyLeaveModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (leave: { fromDate: string; toDate: string; type: LeaveType; reason: string; documentUrl?: string }) => void
}

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Comp-off', 'Unpaid']

const ApplyLeaveModal = ({ open, onClose, onSubmit }: ApplyLeaveModalProps) => {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(todayIso)
  const [toDate, setToDate] = useState(todayIso)
  const [type, setType] = useState<LeaveType>('Casual')
  const [reason, setReason] = useState('')
  const [docName, setDocName] = useState('')

  const reset = () => {
    setFromDate(todayIso)
    setToDate(todayIso)
    setType('Casual')
    setReason('')
    setDocName('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!fromDate || !toDate) { toast.error('Select both from and to dates'); return }
    if (toDate < fromDate) { toast.error('To date cannot be before from date'); return }
    if (!reason.trim()) { toast.error('Reason is required'); return }
    onSubmit({ fromDate, toDate, type, reason: reason.trim(), documentUrl: docName || undefined })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Apply leave</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
            <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason *</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Supporting document</label>
            <input type="file" className="block w-full text-[12px]" onChange={(e) => setDocName(e.target.files?.[0]?.name ?? '')} />
          </div>
        </div>
        <div className="flex items-start gap-2 text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          <FiInfo size={14} className="shrink-0 mt-0.5" />
          <span>Camps already scheduled in this date range will be flagged as conflicts for your manager to reassign.</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApplyLeaveModal
