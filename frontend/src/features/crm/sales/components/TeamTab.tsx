import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FiArrowRight, FiPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate, formatINR, formatPercent } from '@/utils/formatters'
import type { RepAssignment, RepTarget, SalesRep, SalesRole } from '@/types/salesdash.types'
import type { AddRepInput } from '@/features/crm/sales/sales.service'
import { QUARTER } from '@/features/crm/sales/sales.mock'
import { TARGET_STATUS_META, firstNameOf, progressPct, splitName, tintStyle } from '@/features/crm/sales/sales.utils'
import { addPersonSchema } from '@/features/crm/sales/schemas'

type TeamFilter = 'ALL' | 'HEADS' | 'KAMS' | 'ACTIVE' | 'RELIEVED'

interface TeamTabProps {
  reps: SalesRep[]
  targets: RepTarget[]
  assignments: RepAssignment[]
  isApprover: boolean
  meRep: SalesRep | null
  onOpenRep: (repId: string) => void
  onEditTarget: (repId: string) => void
  onOpenApprovals: () => void
  onAddRep: (input: AddRepInput) => void
}

const AddPersonDialog = ({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (input: AddRepInput) => void }) => {
  const [name, setName] = useState('')
  const [role, setRole] = useState<SalesRole>('Key Account Manager')
  const [hq, setHq] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName(''); setRole('Key Account Manager'); setHq(''); setPhone(''); setEmail(''); setSalary(''); setError(null)
  }

  const handleAdd = () => {
    const result = addPersonSchema.safeParse({ name, role, hq, phone, email, salaryInr: salary || 0 })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Name is required.')
      return
    }
    onAdd(result.data)
    reset()
    onClose()
  }

  const field = (label: string, node: ReactNode) => (
    <div>
      <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        {label}
      </Label>
      {node}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Add sales person</DialogTitle>
        </DialogHeader>

        {field('Full name *', (
          <>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="e.g. Kavya Iyer" className="text-[13px]" aria-invalid={!!error} />
            {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
          </>
        ))}

        {field('Role', (
          <Select value={role} onValueChange={(v) => setRole(v as SalesRole)}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Key Account Manager">Key Account Manager</SelectItem>
              <SelectItem value="Sales Head">Sales Head</SelectItem>
            </SelectContent>
          </Select>
        ))}

        <div className="grid grid-cols-2 gap-3">
          {field('HQ city', <Input value={hq} onChange={(e) => setHq(e.target.value)} placeholder="Mumbai" className="text-[13px]" />)}
          {field('Phone', <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." className="text-[13px]" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('Email', <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@qms.health" className="text-[13px]" />)}
          {field('Salary (₹/mo)', <Input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="75000" className="text-[13px]" />)}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={handleAdd}>Add person</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TeamTab = ({ reps, targets, assignments, isApprover, meRep, onOpenRep, onEditTarget, onOpenApprovals, onAddRep }: TeamTabProps) => {
  const [filter, setFilter] = useState<TeamFilter>('ALL')
  const [addOpen, setAddOpen] = useState(false)

  const scoped = isApprover ? reps : reps.filter((r) => r.id === meRep?.id)

  const counts: Record<TeamFilter, number> = useMemo(
    () => ({
      ALL: scoped.length,
      HEADS: scoped.filter((r) => r.role === 'Sales Head').length,
      KAMS: scoped.filter((r) => r.role === 'Key Account Manager').length,
      ACTIVE: scoped.filter((r) => !r.relievedOn).length,
      RELIEVED: scoped.filter((r) => !!r.relievedOn).length,
    }),
    [scoped]
  )

  const filtered = scoped.filter((r) => {
    if (filter === 'HEADS') return r.role === 'Sales Head'
    if (filter === 'KAMS') return r.role === 'Key Account Manager'
    if (filter === 'ACTIVE') return !r.relievedOn
    if (filter === 'RELIEVED') return !!r.relievedOn
    return true
  })

  const CHIPS: { id: TeamFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'HEADS', label: 'Sales Heads' },
    { id: 'KAMS', label: 'KAMs' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'RELIEVED', label: 'Relieved' },
  ]

  return (
    <div>
      {!isApprover && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3.5 mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.08), rgba(20,184,166,.06))', border: '1px solid var(--qms-border)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--qms-text-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--qms-text)' }}>Need a new pharma company / division / MR added?</span>{' '}
            Raise a request — your Sales Head approves it into the master.
          </p>
          <Button size="sm" onClick={onOpenApprovals}>
            Open Approvals <FiArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}

      {isApprover && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                style={
                  filter === chip.id
                    ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
                }
              >
                {chip.label} {counts[chip.id]}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <FiPlus data-icon="inline-start" /> Add sales person
          </Button>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filtered.map((rep) => {
          const { firstName, lastName } = splitName(rep.name)
          const target = targets.find((t) => t.repId === rep.id && t.quarter === QUARTER)
          const statusMeta = target ? TARGET_STATUS_META[target.status] : null
          const accounts = assignments.filter((a) => a.repId === rep.id).length
          const manager = reps.find((r) => r.id === rep.reportsTo)

          return (
            <div
              key={rep.id}
              className="rounded-2xl border p-4"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <UserAvatar firstName={firstName} lastName={lastName} tone={rep.tone} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-bold" style={{ color: 'var(--qms-text)' }}>{rep.name}</span>
                    {rep.relievedOn && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
                        Relieved {formatDate(rep.relievedOn)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {rep.role}{manager ? ` · reports to ${firstNameOf(manager.name)}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {statusMeta ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(statusMeta.color)}>
                    {statusMeta.label}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle('#94a3b8')}>No target</span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                  {rep.hq || '—'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                  {accounts} account{accounts === 1 ? '' : 's'}
                </span>
              </div>

              <div
                className="grid grid-cols-3 gap-2 rounded-xl p-2.5 mb-3"
                style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}
              >
                {[
                  { label: 'Target', value: target ? formatINR(target.target) : '—' },
                  { label: 'Achieved', value: target ? formatINR(target.achieved) : '—' },
                  { label: 'Progress', value: target ? formatPercent(progressPct(target), 0) : '—' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{stat.label}</div>
                    <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] truncate mb-3" style={{ color: 'var(--qms-text-muted)' }}>
                {rep.phone} · {rep.email} · joined {formatDate(rep.joined)}
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => onOpenRep(rep.id)}>Dashboard</Button>
                {isApprover && !rep.relievedOn && (
                  <Button variant="secondary" size="sm" onClick={() => onEditTarget(rep.id)}>
                    {target ? 'Edit target' : 'Set target'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No sales people in this view.
          </div>
        )}
      </div>

      <AddPersonDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={onAddRep} />
    </div>
  )
}

export default TeamTab
