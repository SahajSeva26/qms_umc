import { useState } from 'react'
import { toast } from '@/components/ui/sonner'
import { FiLayers, FiRotateCcw } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import SectionHeader from '@/components/ui/SectionHeader'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@qms/ui'
import { Input } from '@qms/ui'
import PharmaProjectPicker from '@/features/pharma/components/PharmaProjectPicker'
import BookCampForm from '@/features/pharma/components/BookCampForm'
import ProjectStatusPill from '@/features/pharma/components/ProjectStatusPill'
import ProjectDevicesRequiredCard from '@/features/pharma/components/ProjectDevicesRequiredCard'
import { parsePatientExpectation } from '@/features/pharma/utils/patientExpectation'
import { allowedCampTypesForProjectTypes, type WhoCanBookCampCode } from '@/types/project.types'
import { CAMP_TYPE_LABEL, type CampType } from '@/types/campReal.types'
import type { ProjectEntity } from '@/types/project.types'

interface MrBookCampTabProps {
  /** True for the HO/RSM/ASM "Book on behalf of MR" tab — shows BookCampForm's MR picker and
   * swaps this tab's own copy. False (default) is the MR's own self-booking tab, unchanged. */
  needsMrPicker?: boolean
}

// "Project & Camp" section — BookCampForm below self-disables until project+type are picked
// (never hidden), remounting fresh via key={projectId}. Shared by the MR's own "Book camp" tab
// and the HO/RSM/ASM "Book on behalf of MR" tab — only needsMrPicker and the heading/button copy
// differ; the project/camp-type/patient-count section and BookCampForm itself are identical,
// mirroring the prototype's own "one booking implementation, reused everywhere" design.
const MrBookCampTab = ({ needsMrPicker = false }: MrBookCampTabProps) => {
  const { session } = useSession()
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectEntity | null>(null)
  const [campType, setCampType] = useState<CampType | ''>('')
  // Matches the prototype's field placement — "Expected patients" lives in section 1, not
  // BookCampForm's Date/Slot section. Raw string; parsed every render (display + payload).
  const [patientExpectationInput, setPatientExpectationInput] = useState('')

  const allowedTypes = selectedProject ? allowedCampTypesForProjectTypes(selectedProject.type) : []
  // The backend enforces this too (409 on a disallowed role) — this is UX only, surfacing the
  // rejection before the MR fills the whole form instead of after submit.
  const roleCanBook = !selectedProject || selectedProject.whoCanBookCamp.length === 0
    || selectedProject.whoCanBookCamp.includes((session?.roleType?.code ?? '') as WhoCanBookCampCode)
  const hasSlots = !!selectedProject && selectedProject.campTimeSlots.length > 0
  const canBookProject = roleCanBook && hasSlots

  const handleProjectChange = (id: string, label: string, project: ProjectEntity | null) => {
    setProjectId(id)
    setProjectLabel(label)
    setSelectedProject(project)
    // Picks the project's only allowed camp type when unambiguous, leaves the Select for the
    // MR to choose when a project offers more than one.
    const nextAllowedTypes = project ? allowedCampTypesForProjectTypes(project.type) : []
    setCampType(nextAllowedTypes.length === 1 ? nextAllowedTypes[0] : '')
    // Project A's patient count must never carry into project B's booking.
    setPatientExpectationInput('')
  }

  const handleBooked = () => {
    toast.success(needsMrPicker ? 'Camp booked on behalf of the MR' : 'Camp requested')
    setProjectId('')
    setProjectLabel('')
    setSelectedProject(null)
    setCampType('')
    setPatientExpectationInput('')
  }

  const clearForm = () => {
    setProjectId('')
    setProjectLabel('')
    setSelectedProject(null)
    setCampType('')
    setPatientExpectationInput('')
  }

  const bookableProject = selectedProject && canBookProject ? selectedProject : null
  const { value: patientExpectation, error: patientExpectationError } = parsePatientExpectation(patientExpectationInput)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {needsMrPicker ? 'Book on behalf of an MR' : 'Book a new camp'}
          </h2>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            {needsMrPicker
              ? 'Pick an MR from your team, then fill in the rest — confirm at the bottom'
              : "All fields on one page — fill what's needed, then confirm at the bottom"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clearForm}>
          <FiRotateCcw size={12} /> Clear form
        </Button>
      </div>

      <div className="booking-section">
        <SectionHeader icon={FiLayers} spaced={false} number={1}>Project &amp; camp</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <PharmaProjectPicker value={projectId} label={projectLabel} onChange={handleProjectChange} />
            {selectedProject && (
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <ProjectStatusPill status={selectedProject.status} />
                {!canBookProject && (
                  <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {!hasSlots ? 'This project has no configured time slots.' : 'Your role cannot book camps on this project.'}
                  </span>
                )}
              </div>
            )}
          </div>

          <Select value={campType} onValueChange={(v) => setCampType((v ?? '') as CampType | '')} disabled={!bookableProject}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder={bookableProject ? 'Camp type' : 'Pick a project first'} /></SelectTrigger>
            <SelectContent>
              {allowedTypes.map((t) => (
                <SelectItem key={t} value={t}>{CAMP_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <label htmlFor="mrBookCampPatientExpectation" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: 'var(--qms-text-muted)' }}>
              Expected patients
            </label>
            <Input
              id="mrBookCampPatientExpectation"
              type="number"
              className="text-[13px]"
              disabled={!bookableProject}
              value={patientExpectationInput}
              onChange={(e) => setPatientExpectationInput(e.target.value)}
            />
            {patientExpectationError && <p className="text-[11px] mt-1 text-danger">{patientExpectationError}</p>}
          </div>
        </div>
        <ProjectDevicesRequiredCard projectId={bookableProject?.id ?? null} campType={campType} />
      </div>

      {/* Keyed on projectId — BookCampForm owns its own RHF state (doctor/date/slot/location/
          notes), which must never carry over when the picked project changes underneath it. */}
      <BookCampForm
        key={projectId}
        needsMrPicker={needsMrPicker}
        type={bookableProject ? (campType || null) : null}
        project={bookableProject && campType ? { id: bookableProject.id, name: bookableProject.name, campTimeSlots: bookableProject.campTimeSlots, daysToBookBefore: bookableProject.daysToBookBefore } : null}
        patientExpectation={patientExpectation}
        patientExpectationInvalid={!!patientExpectationError}
        onBooked={handleBooked}
        onCancel={clearForm}
      />
    </div>
  )
}

export default MrBookCampTab
