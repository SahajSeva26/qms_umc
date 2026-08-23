import { useState } from 'react'
import type { ProjectEntity } from '@/features/projects/project.types'
import type { DedicatedProjectConfig, ManpowerRoleKey, SopConfig } from '@/features/dedicatedops/dedicatedops.types'
import { ROLE_LABELS } from '@/features/dedicatedops/dedicatedops.types'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

interface SopTabProps {
  dedicatedProjects: ProjectEntity[]
  projectConfigs: Record<string, DedicatedProjectConfig>
  /** Owned by the page, NOT this tab — ProjectDetailDrawer's "Edit SOP" button sets this from outside the SOP tab, so the page must keep it. */
  sopProjectId: string | null
  onSopProjectIdChange: (projectId: string) => void
  /** Plain async callbacks, same convention as AssignFoModal/ConvertProjectModal's `onConfirm` — this tab owns its own error surfacing, not the mutation object. */
  onSaveSop: (projectId: string, patch: Partial<SopConfig>) => Promise<unknown>
  onResetSop: (projectId: string) => Promise<unknown>
}

// SOP configuration form + manpower summary for one dedicated project.
//
// STATE OWNERSHIP: `sopProjectId` itself stays in the page (see the prop
// comment above) — everything DERIVED from it (activeSopProjectId/
// activeSopProject/activeSopConfig) is computed here instead, since nothing
// outside this tab needs those derived values. `resetting` is local UI state
// for the Reset button, matching the modals' own `saving` convention rather
// than reading `.isPending` off a mutation object this tab never sees.
const SopTab = ({ dedicatedProjects, projectConfigs, sopProjectId, onSopProjectIdChange, onSaveSop, onResetSop }: SopTabProps) => {
  const [resetting, setResetting] = useState(false)

  const activeSopProjectId = sopProjectId ?? dedicatedProjects[0]?.id ?? null
  const activeSopProject = dedicatedProjects.find((p) => p.id === activeSopProjectId)
  const activeSopConfig = activeSopProjectId ? projectConfigs[activeSopProjectId]?.sopConfig : undefined

  const handleSaveSop = async (projectId: string, patch: Partial<SopConfig>) => {
    try {
      await onSaveSop(projectId, patch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the SOP setting — try again.')
    }
  }

  const handleResetSop = async (projectId: string) => {
    setResetting(true)
    try {
      await onResetSop(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the SOP — try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Project</label>
        <select
          value={activeSopProjectId ?? ''}
          onChange={(e) => onSopProjectIdChange(e.target.value)}
          className="w-full text-[13px] rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
        >
          {dedicatedProjects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
        </select>
      </div>

      {activeSopConfig && activeSopProjectId && (
        // `key` forces React to remount this whole subtree when the
        // selected project changes. Every field below is an uncontrolled
        // input (defaultValue/defaultChecked, saved onBlur/onChange to
        // avoid a round-trip per keystroke) — without a key, switching
        // projects re-rendered the SAME DOM nodes, so `defaultValue` was
        // never re-applied and the previous project's values stayed on
        // screen (and could be saved onto the newly-selected project on
        // the next blur). Remounting is the standard fix for this exact
        // class of bug and needs no change to the controlled-vs-
        // uncontrolled design.
        <div key={activeSopProjectId} className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Upload deadline (hrs)</label>
              <input type="number" min={1} max={72} defaultValue={activeSopConfig.uploadDeadlineHours}
                onBlur={(e) => handleSaveSop(activeSopProjectId, { uploadDeadlineHours: Number(e.target.value) })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Report TAT (hrs)</label>
              <input type="number" min={1} max={72} defaultValue={activeSopConfig.reportTatHours}
                onBlur={(e) => handleSaveSop(activeSopProjectId, { reportTatHours: Number(e.target.value) })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Min screenings/day</label>
              <input type="number" min={0} defaultValue={activeSopConfig.minScreeningsPerDay}
                onBlur={(e) => handleSaveSop(activeSopProjectId, { minScreeningsPerDay: Number(e.target.value) })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Weekly off</label>
              <select defaultValue={activeSopConfig.weeklyOff}
                onChange={(e) => handleSaveSop(activeSopProjectId, { weeklyOff: e.target.value })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'None'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Working hours start</label>
              <input type="time" defaultValue={activeSopConfig.workingHoursStart}
                onBlur={(e) => handleSaveSop(activeSopProjectId, { workingHoursStart: e.target.value })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Working hours end</label>
              <input type="time" defaultValue={activeSopConfig.workingHoursEnd}
                onBlur={(e) => handleSaveSop(activeSopProjectId, { workingHoursEnd: e.target.value })}
                className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              ['photoRequired', 'Doctor clinic photo required'],
              ['geoTagRequired', 'GPS geo-tag required'],
              ['selfieRequired', 'Check-in selfie required'],
              ['redactPatientIdsForPharma', 'Redact patient IDs for pharma'],
            ] as [keyof SopConfig, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-full border cursor-pointer" style={{ borderColor: 'var(--qms-border)' }}>
                <input
                  type="checkbox"
                  defaultChecked={activeSopConfig[key] as boolean}
                  onChange={(e) => handleSaveSop(activeSopProjectId, { [key]: e.target.checked } as Partial<SopConfig>)}
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mandatory fields (comma-separated)</label>
            <input defaultValue={activeSopConfig.mandatoryFields.join(', ')}
              onBlur={(e) => handleSaveSop(activeSopProjectId, { mandatoryFields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Escalation chain (comma-separated)</label>
            <input defaultValue={activeSopConfig.escalationChain.join(', ')}
              onBlur={(e) => handleSaveSop(activeSopProjectId, { escalationChain: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
          </div>

          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            The FO portal reads these settings live — no code change needed to apply.
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleResetSop(activeSopProjectId)} disabled={resetting}>Reset to defaults</Button>
          </div>
        </div>
      )}

      {activeSopProject && projectConfigs[activeSopProject.id] && (
        <div className="mt-4 rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Manpower required</h3>
          <div className="grid grid-cols-3 gap-2 text-[12px]">
            {(Object.keys(ROLE_LABELS) as ManpowerRoleKey[]).map((key) => (
              <div key={key} className="flex justify-between px-2 py-1 rounded-lg" style={{ background: 'var(--qms-surface-strong)' }}>
                <span style={{ color: 'var(--qms-text-muted)' }}>{ROLE_LABELS[key]}</span>
                <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{projectConfigs[activeSopProject.id].manpowerRequired[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SopTab
