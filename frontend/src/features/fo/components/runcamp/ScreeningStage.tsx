import { useState } from 'react'
import { FiPlus, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { RunCampScreeningResult } from '@/types/camp.types'
import type { PatientFieldDef } from '@/features/fo/foConfig.types'
import AddPatientSubWizard from '@/features/fo/components/runcamp/AddPatientSubWizard'

interface ScreeningStageProps {
  screeningResults: RunCampScreeningResult[]
  patientFields: PatientFieldDef[] | undefined
  testIds: string[] | undefined
  onAddPatient: (result: RunCampScreeningResult) => void
}

const ScreeningStage = ({ screeningResults, patientFields, testIds, onAddPatient }: ScreeningStageProps) => {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [askAnother, setAskAnother] = useState(false)

  const handleSave = (result: RunCampScreeningResult) => {
    onAddPatient(result)
    setWizardOpen(false)
    setAskAnother(true)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
          {screeningResults.length} patient{screeningResults.length === 1 ? '' : 's'} screened
        </div>
        <Button size="sm" onClick={() => setWizardOpen(true)}><FiPlus size={13} /> Add patient</Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        {screeningResults.length === 0 ? (
          <div className="text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No patients added yet.</div>
        ) : (
          screeningResults.map((r, i) => (
            <div key={`${r.patientCode}-${i}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t first:border-t-0" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] truncate" style={{ color: 'var(--qms-text)' }}>{r.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                    {r.age}y · {r.gender}{r.patientCode ? ` · ${r.patientCode}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.criticalFinding && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    <FiAlertTriangle size={10} /> CRITICAL
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  <FiCheckCircle size={10} /> COMPLETE
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <AddPatientSubWizard
        open={wizardOpen}
        patientFields={patientFields}
        testIds={testIds}
        patientNumber={screeningResults.length + 1}
        onSave={handleSave}
        onClose={() => setWizardOpen(false)}
      />

      <Dialog open={askAnother} onOpenChange={(o) => !o && setAskAnother(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Patient saved</DialogTitle></DialogHeader>
          <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Add another patient?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskAnother(false)}>No, done for now</Button>
            <Button onClick={() => { setAskAnother(false); setWizardOpen(true) }}>Yes, add another</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ScreeningStage
