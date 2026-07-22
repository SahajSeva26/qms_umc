// Company → Division → HQ Mapping drill-down helpers — exact port of
// hq-mapping.js's mrServiceability()/companyRollup() project-wise rollup
// logic (lines 136-201, 237-246), adapted to this app's real ClientMr shape
// (MrServiceability.{screening,diet,lab}.cities, not the prototype's
// arbitrary per-project TESTS→device lookup — the representative device per
// project type below mirrors the prototype's own PROJECT_DEVICE map).
import type { ClientMr } from '@/types/client.types'
import type { GeoFo } from '@/features/hq/hq.types'
import { classifyCity } from '@/features/hq/hq.service'

export type RollupProject = 'Screening' | 'Diet' | 'Lab'
export const ROLLUP_PROJECTS: RollupProject[] = ['Screening', 'Diet', 'Lab']

// Representative device-type per project — exact port of hq-mapping.js's
// PROJECT_DEVICE map (line 136-140).
export const PROJECT_DEVICE: Record<RollupProject, string> = {
  Screening: 'Glucometer',
  Diet: 'Body Composition',
  Lab: 'Lipid',
}

function mrProjectCities(mr: ClientMr, project: RollupProject): string[] {
  const key = project === 'Diet' ? 'diet' : project === 'Lab' ? 'lab' : 'screening'
  return mr.serviceability?.[key]?.cities ?? []
}

export interface MrServiceabilityResult {
  device: string
  serviceable: { mr: ClientMr; serviceable: boolean }[]
  nonServiceable: { mr: ClientMr; serviceable: boolean }[]
}

// mrServiceability() — classifies each MR's HQ city against the project's
// representative device via the shared classifyCity() 3-tier engine.
export function mrServiceability(mrList: ClientMr[], project: RollupProject, fos: GeoFo[]): MrServiceabilityResult {
  const device = PROJECT_DEVICE[project]
  const serviceable: { mr: ClientMr; serviceable: boolean }[] = []
  const nonServiceable: { mr: ClientMr; serviceable: boolean }[] = []
  mrList.forEach((mr) => {
    const res = classifyCity(mr.hq, device, fos)
    const entry = { mr, serviceable: res.serviceable }
    ;(res.serviceable ? serviceable : nonServiceable).push(entry)
  })
  return { device, serviceable, nonServiceable }
}

// A MR "counts" for a project if they declare ≥1 covered city for it — used
// by the company/division rollup cards' project chips (mirrors
// mrServiceabilityForType() in hq-serviceability.js:214-218, reused here
// against the real ClientMr shape).
export function mrDeclaresProject(mr: ClientMr, project: RollupProject): boolean {
  return mrProjectCities(mr, project).length > 0
}

export function mrHasAnyServiceability(mr: ClientMr): boolean {
  return ROLLUP_PROJECTS.some((p) => mrDeclaresProject(mr, p))
}
