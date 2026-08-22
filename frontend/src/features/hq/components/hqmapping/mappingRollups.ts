// Company → Division → HQ Mapping drill-down helpers — exact port of
// hq-mapping.js's mrServiceability()/companyRollup() project-wise rollup
// logic (lines 136-201, 237-246), adapted to this app's real ClientMr shape
// (MrServiceability.{screening,diet,lab}.cities, not the prototype's
// arbitrary per-project TESTS→device lookup — the representative device per
// project type below mirrors the prototype's own PROJECT_DEVICE map).
import type { ClientMr, ClientProject } from '@/types/client.types'
import { CLIENTS } from '@/types/client.mock'
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

// mrServiceableForType() — an MR can service a project if they cover at
// least one city for THAT project's own camp type (screening/diet/lab).
// Exact port of hq-serviceability.js:214-218 — deliberately NOT "any
// discipline counts," which would inflate a Diet-only-serviceable MR into
// counting as coverage for a Screening project. Takes a raw ClientProject
// type string (not the RollupProject enum above) since it classifies real
// project records, which don't share that enum's exact casing/vocabulary.
export function mrServiceableForType(mr: ClientMr, type: string): boolean {
  const t = /diet/i.test(type) ? 'diet' : /lab/i.test(type) ? 'lab' : 'screening'
  return (mr.serviceability?.[t]?.cities ?? []).length > 0
}

export interface ProjectRollupRow {
  id: string; name: string; client: string; type: string; total: number; serv: number; non: number
}

// buildProjectRollups() — exact port of hq-serviceability.js's mrProjectRows()
// (lines 223-231), scoped to this app's real ClientProject master
// (features/crm/clients/clients.mock.ts's PROJECTS) rather than the
// prototype's window.QMS_ADMIN.PROJECTS — same shape, same per-project
// discipline-specific serviceability check, not an invented per-division
// "any discipline" substitute.
export function buildProjectRollups(mrs: ClientMr[], projects: ClientProject[]): ProjectRollupRow[] {
  return projects
    .map((p) => {
      const type = p.type || 'Screening'
      const mine = mrs.filter((m) => m.clientId === p.clientId && (!p.divisionId || m.divisionId === p.divisionId))
      const serv = mine.filter((m) => mrServiceableForType(m, type)).length
      const client = CLIENTS.find((c) => c.id === p.clientId)?.name ?? p.clientId
      return { id: p.id, name: p.name || p.id, client, type, total: mine.length, serv, non: mine.length - serv }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}
