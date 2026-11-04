import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useCreateWeeklyPlan } from '@/features/crm/weeklyPlan/hooks/useCreateWeeklyPlan'
import { useUpdateWeeklyPlan } from '@/features/crm/weeklyPlan/hooks/useUpdateWeeklyPlan'
import WeeklyPlanRowFields, { type WeeklyPlanRowDraft } from '@/features/crm/weeklyPlan/components/WeeklyPlanRowFields'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@qms/ui'
// startOfWeek/addDays/dayKey are local-timezone-safe (operate on Date fields, not UTC) — reused
// here instead of toISOString().slice(0,10), which shifts a date by one day in IST (UTC+5:30).
import { startOfWeek, addDays, dayKey } from '@/utils/calendarDate'
import { toSubmitIso, isOutsideWeek } from '@/features/crm/weeklyPlan/components/weeklyPlanDates'
import type { WeeklyPlanEntity } from '@/types/weeklyPlan.types'

const MAX_PLANS = 6

const toDateInput = dayKey

const emptyRow = (): WeeklyPlanRowDraft => ({ tenant: '', division: '', contactPerson: '', date: '' })

interface WeeklyPlanFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** When set, edits/resubmits this existing plan instead of creating a new one. */
  plan?: WeeklyPlanEntity
}

const populatedId = (value: { _id?: string } | string | undefined) => (typeof value === 'string' ? value : value?._id ?? '')
const populatedName = (value: { name?: string } | string | undefined) => (typeof value === 'string' || !value ? '' : value.name ?? '')
const populatedLeadLabel = (value: { title?: string; code?: string } | string | undefined) =>
  typeof value === 'string' || !value ? '' : (value.title ? `${value.code} · ${value.title}` : value.code ?? '')
const populatedInvoiceLabel = (value: { code?: string } | string | undefined) =>
  (typeof value === 'string' || !value ? '' : value.code ?? '')

const draftRowsFromPlan = (plan: WeeklyPlanEntity | undefined): WeeklyPlanRowDraft[] => {
  if (!plan || !plan.plans.length) return [emptyRow()]
  return plan.plans.map((p) => ({
    tenant: populatedId(p.tenant),
    tenantLabel: populatedName(p.tenant),
    division: populatedId(p.division),
    divisionLabel: populatedName(p.division),
    contactPerson: populatedId(p.contactPerson),
    contactPersonLabel: populatedName(p.contactPerson),
    lead: populatedId(p.lead) || undefined,
    leadLabel: populatedLeadLabel(p.lead),
    invoice: populatedId(p.invoice) || undefined,
    invoiceLabel: populatedInvoiceLabel(p.invoice),
    parent: populatedId(p.parent) || undefined,
    agenda: p.agenda,
    date: p.date,
  }))
}

// Caller keys this by plan id so switching create/edit remounts fresh, not via an effect.
const WeeklyPlanFormDialog = ({ open, onClose, onSaved, plan }: WeeklyPlanFormDialogProps) => {
  const nextWeekStart = startOfWeek(addDays(new Date(), 7))
  const [startDate, setStartDate] = useState(() => (plan ? plan.startDate.slice(0, 10) : toDateInput(nextWeekStart)))
  const [endDate, setEndDate] = useState(() => (plan ? plan.endDate.slice(0, 10) : toDateInput(addDays(nextWeekStart, 6))))
  const [rows, setRows] = useState<WeeklyPlanRowDraft[]>(() => draftRowsFromPlan(plan))
  const [error, setError] = useState('')

  const createWeeklyPlan = useCreateWeeklyPlan()
  const updateWeeklyPlan = useUpdateWeeklyPlan(plan?.id ?? '')
  const isPending = createWeeklyPlan.isPending || updateWeeklyPlan.isPending

  const updateRow = (index: number, patch: Partial<WeeklyPlanRowDraft>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index))
  const addRow = () => setRows((prev) => (prev.length < MAX_PLANS ? [...prev, emptyRow()] : prev))

  const handleClose = () => {
    onClose()
  }

  const handleSave = async () => {
    if (!startDate || !endDate) return setError('Select a start and end date')
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be on or after start date')
    for (const row of rows) {
      if (!row.tenant || !row.division || !row.contactPerson || !row.date) {
        return setError('Every visit needs a company, division, contact person, and date')
      }
      if (isOutsideWeek(row.date, startDate, endDate)) {
        return setError('Every visit date must fall within the plan\'s week')
      }
    }

    setError('')
    const payload = {
      startDate: toSubmitIso(startDate),
      endDate: toSubmitIso(endDate),
      plans: rows.map((row) => ({
        tenant: row.tenant,
        division: row.division,
        contactPerson: row.contactPerson,
        lead: row.lead,
        invoice: row.invoice,
        parent: row.parent,
        agenda: row.agenda,
        date: row.date,
      })),
    }

    try {
      if (plan) {
        await updateWeeklyPlan.mutateAsync(payload)
        toast.success('Weekly plan updated')
      } else {
        await createWeeklyPlan.mutateAsync(payload)
        toast.success('Weekly plan submitted for approval')
      }
      onSaved()
      handleClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the weekly plan — try again.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit weekly plan' : 'New weekly plan'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-[11px] font-bold tracking-[.04em] uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Week start *
              </Label>
              <DatePicker value={startDate} onChange={setStartDate} className="w-full" />
            </div>
            <div>
              <Label className="block text-[11px] font-bold tracking-[.04em] uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Week end *
              </Label>
              <DatePicker value={endDate} onChange={setEndDate} className="w-full" />
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <WeeklyPlanRowFields
                key={index}
                row={row}
                index={index}
                onChange={updateRow}
                onRemove={removeRow}
                canRemove={rows.length > 1}
                weekStart={startDate}
                weekEnd={endDate}
              />
            ))}
          </div>

          {rows.length < MAX_PLANS && (
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
              <FiPlus size={14} /> Add visit ({rows.length}/{MAX_PLANS})
            </Button>
          )}

          {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {isPending ? 'Saving...' : plan ? 'Save changes' : 'Submit for approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default WeeklyPlanFormDialog
