import { useMemo, useState } from 'react'
import { FiInfo, FiNavigation, FiHeart, FiUsers, FiCheck } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { usePeopleData } from '@/hooks/usePeopleData'
import type { Camp, CampResources } from '@/types/camp.types'
import type { CampType } from '@/types/camp.types'

interface ResourceAssignModalProps {
  open: boolean
  onClose: () => void
  camp: Camp
}

// Camp type → primary required staff role (mirrors camps-manager.js's
// PRIMARY_ROLE_BY_TYPE: Screening→FO, Diet→Dietitian, Lab→Lab Tech).
// Manpower is always additional, never primary.
type PrimaryRoleId = 'FO' | 'DIETITIAN' | 'LABTECH'
const PRIMARY_ROLE_BY_TYPE: Record<CampType, PrimaryRoleId> = {
  Screening: 'FO',
  Diet: 'DIETITIAN',
  Lab: 'LABTECH',
}
const PRIMARY_ROLE_LABEL: Record<PrimaryRoleId, string> = {
  FO: 'Field Officer',
  DIETITIAN: 'Dietitian',
  LABTECH: 'Lab Technician',
}

const ResourceAssignModal = ({ open, onClose, camp }: ResourceAssignModalProps) => {
  const { people: fos } = usePeopleData('Field Officer')
  const { people: dietitians } = usePeopleData('Dietitian')
  const { people: labTechs } = usePeopleData('Lab Technician')
  const { people: manpower } = usePeopleData('Manpower')

  const existing = camp.resources || {
    FO: camp.foId || '',
    DIETITIAN: camp.dietitianId || '',
    LABTECH: '',
    MANPOWER: [] as string[],
  }

  const [foId, setFoId] = useState(existing.FO || '')
  const [dietitianId, setDietitianId] = useState(existing.DIETITIAN || '')
  const [labTechId, setLabTechId] = useState(existing.LABTECH || '')
  const [manpowerIds, setManpowerIds] = useState<string[]>(existing.MANPOWER || [])
  const [notes, setNotes] = useState((camp.resources as (CampResources & { notes?: string }) | undefined)?.notes ?? '')
  const [overrideAck, setOverrideAck] = useState(false)

  const primaryId = PRIMARY_ROLE_BY_TYPE[camp.type] || 'FO'
  const primaryLabel = PRIMARY_ROLE_LABEL[primaryId]

  const primaryValue = primaryId === 'FO' ? foId : primaryId === 'DIETITIAN' ? dietitianId : labTechId
  const primaryEmpty = !primaryValue

  const toggleManpower = (id: string) => {
    setManpowerIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const canSave = !primaryEmpty || overrideAck

  const summary = useMemo(() => {
    const parts: string[] = []
    if (foId) parts.push('1 field officer')
    if (dietitianId) parts.push('1 dietitian')
    if (labTechId) parts.push('1 lab technician')
    if (manpowerIds.length > 0) parts.push(`${manpowerIds.length} manpower`)
    return parts.join(' · ') || 'no resources assigned'
  }, [foId, dietitianId, labTechId, manpowerIds])

  const handleSave = () => {
    const newResources: CampResources & { notes?: string } = {
      FO: foId,
      DIETITIAN: dietitianId,
      LABTECH: labTechId,
      MANPOWER: manpowerIds,
      notes,
    }
    toast.info(
      `UI only — wiring comes next pass. Would save: ${JSON.stringify(newResources)} · ${summary}${primaryEmpty ? ` · missing ${primaryLabel}` : ''}`
    )
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign resources</DialogTitle>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.id} · {camp.type}</div>
        </DialogHeader>

        <div
          className="flex items-start gap-2 mb-1 p-2.5 rounded-lg text-[12px]"
          style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)' }}
        >
          <FiInfo size={13} style={{ color: 'var(--qms-brand)', marginTop: 1, flexShrink: 0 }} />
          <span>
            {camp.type} camp · primary required role is <b style={{ color: 'var(--qms-brand)' }}>{primaryLabel}</b>.
            Manpower picks from people with role <b>Manpower</b>.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-xl border"
            style={
              primaryId === 'FO' && primaryEmpty
                ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px var(--danger-soft)' }
                : { borderColor: 'var(--qms-border)' }
            }
          >
            <div className="flex items-center gap-2 mb-2 text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white shrink-0" style={{ background: '#3b6dff' }}>
                <FiNavigation size={12} />
              </span>
              Field Officer
              {primaryId === 'FO' && (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                  Required
                </span>
              )}
            </div>
            <Select value={foId || undefined} onValueChange={(v) => setFoId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder={primaryId === 'FO' ? 'Select (required)' : 'Unassigned'} />
              </SelectTrigger>
              <SelectContent>
                {fos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.hq ? ` · ${p.hq}` : ''}{p.phone ? ` · ${p.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              {fos.length} candidate{fos.length === 1 ? '' : 's'} available
              {primaryId === 'FO' && fos.length === 0 ? ' · enrol via Admin · People' : ''}
            </div>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={
              primaryId === 'DIETITIAN' && primaryEmpty
                ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px var(--danger-soft)' }
                : { borderColor: 'var(--qms-border)' }
            }
          >
            <div className="flex items-center gap-2 mb-2 text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white shrink-0" style={{ background: '#10b981' }}>
                <FiHeart size={12} />
              </span>
              Dietitian
              {primaryId === 'DIETITIAN' && (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                  Required
                </span>
              )}
            </div>
            <Select value={dietitianId || undefined} onValueChange={(v) => setDietitianId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder={primaryId === 'DIETITIAN' ? 'Select (required)' : 'Unassigned'} />
              </SelectTrigger>
              <SelectContent>
                {dietitians.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.hq ? ` · ${p.hq}` : ''}{p.phone ? ` · ${p.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              {dietitians.length} candidate{dietitians.length === 1 ? '' : 's'} available
              {primaryId === 'DIETITIAN' && dietitians.length === 0 ? ' · enrol via Admin · People' : ''}
            </div>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={
              primaryId === 'LABTECH' && primaryEmpty
                ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px var(--danger-soft)' }
                : { borderColor: 'var(--qms-border)' }
            }
          >
            <div className="flex items-center gap-2 mb-2 text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white shrink-0" style={{ background: '#8b5cf6' }}>
                <FiUsers size={12} />
              </span>
              Lab Technician
              {primaryId === 'LABTECH' && (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                  Required
                </span>
              )}
            </div>
            <Select value={labTechId || undefined} onValueChange={(v) => setLabTechId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder={primaryId === 'LABTECH' ? 'Select (required)' : 'Unassigned'} />
              </SelectTrigger>
              <SelectContent>
                {labTechs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.hq ? ` · ${p.hq}` : ''}{p.phone ? ` · ${p.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              {labTechs.length} candidate{labTechs.length === 1 ? '' : 's'} available
              {primaryId === 'LABTECH' && labTechs.length === 0 ? ' · enrol via Admin · People' : ''}
            </div>
          </div>

          <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-2 mb-2 text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white shrink-0" style={{ background: '#f59e0b' }}>
                <FiUsers size={12} />
              </span>
              Manpower <span className="text-[11px] font-medium" style={{ color: 'var(--qms-text-muted)' }}>(Manpower role)</span>
            </div>
            <div className="max-h-[132px] overflow-y-auto rounded-lg border p-1.5 space-y-1" style={{ borderColor: 'var(--qms-border)' }}>
              {manpower.length === 0 ? (
                <div className="text-[11px] px-1.5 py-1" style={{ color: 'var(--qms-text-muted)' }}>— No Manpower in people master —</div>
              ) : (
                manpower.map((p) => {
                  const checked = manpowerIds.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-1.5 py-1 rounded-md cursor-pointer text-[12px]"
                      style={{ background: checked ? 'var(--qms-surface-strong)' : 'transparent', color: 'var(--qms-text)' }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleManpower(p.id)} className="accent-current" />
                      {p.name}{p.hq ? ` · ${p.hq}` : ''}
                    </label>
                  )
                })
              )}
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              {manpowerIds.length} selected · {manpower.length} Manpower{manpower.length === 1 ? '' : ''}
            </div>
          </div>
        </div>

        <div className="mt-1">
          <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Resource notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle, equipment, kit instructions..."
            rows={2}
            className="text-[13px]"
          />
        </div>

        {primaryEmpty && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg text-[12px]"
            style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
          >
            <FiInfo size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <div className="space-y-1.5">
              <div>
                {camp.type} camp without a {primaryLabel} — this slot is the primary required role and the camp can&apos;t run mis-staffed.
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input type="checkbox" checked={overrideAck} onChange={(e) => setOverrideAck(e.target.checked)} />
                I understand this camp has no {primaryLabel} assigned
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave} onClick={handleSave} className="font-semibold">
            <FiCheck size={14} /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ResourceAssignModal
