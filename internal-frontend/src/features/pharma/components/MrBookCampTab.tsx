import { useState } from 'react'
import { toast } from 'sonner'
import { FiLayers, FiRotateCcw } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import SectionHeader from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PharmaProjectPicker from '@/features/pharma/components/PharmaProjectPicker'
import BookCampForm from '@/features/pharma/components/BookCampForm'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectDevicesRequiredCard from '@/components/widgets/camp/ProjectDevicesRequiredCard'
import { parsePatientExpectation } from '@/features/pharma/utils/patientExpectation'
import { allowedCampTypesForProjectTypes, type WhoCanBookCampCode } from '@/types/project.types'
import { CAMP_TYPE_LABEL, type CampType } from '@/types/campReal.types'
import type { ProjectEntity } from '@/types/project.types'

// Prototype's "Project & Camp" section — an MR picks project + camp type inline here. BookCampForm
// below self-disables until both are picked (never hidden), and remounts fresh (key={projectId}).
const MrBookCampTab = () => {
  const { session } = useSession()
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectEntity | null>(null)
  const [campType, setCampType] = useState<CampType | ''>('')
  // Matches the prototype's field placement — "Expected patients" lives in section 1, not
  // BookCampForm's Date/Slot section. Raw string; parsed every render (display + payload).
  const [patientExpectationInput, setPatientExpectationInput] = useState('')

  const allowedTypes = selectedProject ? allowedCampTypesForProjectTypes(selectedProject.type) : []
  const needsMrPicker = session?.roleType?.code !== 'pharma-mr'
  const roleCanBook = !selectedProject || selectedProject.whoCanBookCamp.length === 0
    || selectedProject.whoCanBookCamp.includes((session?.roleType?.code ?? '') as WhoCanBookCampCode)
  const hasSlots = !!selectedProject && selectedProject.campTimeSlots.length > 0
  const canBookProject = roleCanBook && hasSlots

  const handleProjectChange = (id: string, label: string, project: ProjectEntity | null) => {
    setProjectId(id)
    setProjectLabel(label)
    setSelectedProject(project)
    // Mirrors CampDetailPageReal's same default — picks the project's only allowed camp type when
    // unambiguous, leaves the Select for the MR to choose when a project offers more than one.
    const nextAllowedTypes = project ? allowedCampTypesForProjectTypes(project.type) : []
    setCampType(nextAllowedTypes.length === 1 ? nextAllowedTypes[0] : '')
    // Project A's patient count must never carry into project B's booking.
    setPatientExpectationInput('')
  }

  const handleBooked = () => {
    toast.success('Camp requested')
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
      <div className="booking-intro">
        <div>
          <h2>Book a new camp</h2>
          <p>All fields on one page — fill what's needed, then confirm at the bottom</p>
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
            <Label htmlFor="mrBookCampPatientExpectation" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">
              Expected patients
            </Label>
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
        {selectedProject && <ProjectDevicesRequiredCard testIds={selectedProject.tests} campType={campType} />}
      </div>

      {/* Keyed on projectId — BookCampForm owns its own RHF state (location/doctor/date/slot/
          notes), which must never carry over when the picked project changes underneath it; a
          stale doctor/date picked for project A could otherwise submit against project B.
          patientExpectation lives up here (section 1), not inside BookCampForm's own form. */}
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
