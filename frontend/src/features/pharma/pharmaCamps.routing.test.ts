import { describe, it, expect } from 'vitest'
import { resolveProjectCampsRoute } from './pharmaCamps.routing'
import type { ProjectEntity } from '@/types/project.types'

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return { id: 'proj-1', type: ['screening_camp', 'diet'], ...overrides } as ProjectEntity
}

describe('resolveProjectCampsRoute', () => {
  it('defaults to Screening when no preferred type is given and the project allows it', () => {
    const project = projectFixture({ id: 'p1', type: ['screening_camp', 'diet'] })
    expect(resolveProjectCampsRoute(project)).toBe('/pharma/projects/p1/camps/screening')
  })

  it('falls back to Diet when Screening is not allowed', () => {
    const project = projectFixture({ id: 'p2', type: ['diet'] })
    expect(resolveProjectCampsRoute(project)).toBe('/pharma/projects/p2/camps/diet')
  })

  it('falls back to the unrestricted All-camps route when neither Screening nor Diet is allowed (e.g. lab_test-only)', () => {
    const project = projectFixture({ id: 'p3', type: ['lab_test'] })
    expect(resolveProjectCampsRoute(project)).toBe('/pharma/projects/p3/camps')
  })

  it('a mixed-type project (allows all 3) defaults to Screening', () => {
    const project = projectFixture({ id: 'p4', type: ['mixed'] })
    expect(resolveProjectCampsRoute(project)).toBe('/pharma/projects/p4/camps/screening')
  })

  it('honors a preferred type when the project allows it', () => {
    const project = projectFixture({ id: 'p5', type: ['screening_camp', 'diet'] })
    expect(resolveProjectCampsRoute(project, 'diet')).toBe('/pharma/projects/p5/camps/diet')
  })

  it('ignores a preferred type the project does not allow, falling back to the normal priority', () => {
    const project = projectFixture({ id: 'p6', type: ['screening_camp'] })
    expect(resolveProjectCampsRoute(project, 'diet')).toBe('/pharma/projects/p6/camps/screening')
  })

  it('a null/undefined preferred type behaves exactly like omitting it', () => {
    const project = projectFixture({ id: 'p7', type: ['diet'] })
    expect(resolveProjectCampsRoute(project, null)).toBe('/pharma/projects/p7/camps/diet')
    expect(resolveProjectCampsRoute(project, undefined)).toBe('/pharma/projects/p7/camps/diet')
  })

  it('a project with an empty/malformed type array falls back to the All-camps route, not a crash', () => {
    const project = projectFixture({ id: 'p8', type: [] })
    expect(resolveProjectCampsRoute(project)).toBe('/pharma/projects/p8/camps')
  })
})
