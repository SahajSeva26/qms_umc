import { useMemo } from 'react'
import type {
  Assignment, Attendance, DedicatedProjectConfig, Screening,
} from '@/features/dedicatedops/dedicatedops.types'
import { DEFAULT_SOP } from '@/features/dedicatedops/dedicatedops.types'
import { complianceFor } from '@/features/dedicatedops/dedicatedops.service'

interface UseDedicatedOpsComplianceArgs {
  assignments: Record<string, Assignment>
  projectConfigs: Record<string, DedicatedProjectConfig>
  attendance: Attendance[]
  screenings: Screening[]
  /** ISO date (yyyy-mm-dd) compliance is evaluated against — "today" from the caller. */
  today: string
}

// Per-assignment SOP compliance, plus the attendance/screenings indexes the
// Live-FOs tab reuses for its own per-row lookups.
//
// WHY THIS IS ITS OWN HOOK (Phase 2): DedicatedOpsPage previously called
// complianceFor() once per assignment, and complianceFor() itself did a full
// `attendance.find()` and `screenings.filter()` per call — O(F × (A + S)) for
// F assignments. The Live tab then repeated ANOTHER attendance.find() and
// screenings.filter() per row on every render, on top of an O(F)
// `complianceByFo.find()` per row (an O(F²) scan). None of this shows up at
// today's seed-data scale (1 assignment, 1 attendance record, 2 screenings)
// but scales quadratically with real fleet size and attendance history.
//
// `attendance` and `screenings` are each parsed into a Map ONCE below;
// every per-FO/per-date lookup after that is O(1). complianceFor()'s
// checklist/overdue FORMULA is untouched — only how its inputs are resolved
// changed (see the comment on complianceFor() itself).
//
// Pulled out of the page (rather than left as inline useMemos) because this
// is a self-contained business-rule computation with no JSX — it can be
// reasoned about and tested independently of how the page renders it.
export function useDedicatedOpsCompliance({ assignments, projectConfigs, attendance, screenings, today }: UseDedicatedOpsComplianceArgs) {
  const attendanceByFoAndDate = useMemo(() => {
    const map = new Map<string, Attendance>()
    attendance.forEach((a) => map.set(`${a.foId}|${a.date}`, a))
    return map
  }, [attendance])

  const screeningsCountByFoAndDate = useMemo(() => {
    const map = new Map<string, number>()
    screenings.forEach((s) => {
      const key = `${s.foId}|${s.date}`
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [screenings])

  const complianceByFo = useMemo(() => {
    return Object.values(assignments)
      .map((a) => {
        const sop = projectConfigs[a.projectId]?.sopConfig ?? DEFAULT_SOP
        const key = `${a.foId}|${today}`
        return complianceFor(a, attendanceByFoAndDate.get(key), screeningsCountByFoAndDate.get(key) ?? 0, sop)
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [assignments, projectConfigs, attendanceByFoAndDate, screeningsCountByFoAndDate, today])

  // O(1) per-row lookup for the Live tab — replaces an O(F) .find() per row
  // (an O(F²) scan across the whole tab) with a Map built once, here.
  const complianceByFoId = useMemo(
    () => new Map(complianceByFo.map((c) => [c.foId, c] as const)),
    [complianceByFo],
  )

  const nonCompliant = useMemo(
    () => complianceByFo.filter((c) => !c.ok).sort((a, b) => b.overdueHours - a.overdueHours || (a.total - a.done) - (b.total - b.done)),
    [complianceByFo],
  )

  return {
    complianceByFo,
    complianceByFoId,
    nonCompliant,
    /** Exposed so the Live tab's own per-row "today's attendance"/"today's screening count" reuse the SAME index instead of rebuilding one. */
    attendanceByFoAndDate,
    screeningsCountByFoAndDate,
  }
}
