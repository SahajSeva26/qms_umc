// Role/coordinator scoping for the Diet screens — who counts as "admin-like",
// which coordinator the logged-in user maps to, and which camps/projects/
// clients fall inside that coordinator's scope.
//
// Pure functions over master data — owns no store.

import type { Camp } from '@/types/camp.types'
import { PEOPLE } from '@/types/people.mock'
import { CLIENTS, PROJECTS } from '@/types/client.types'
import type { ClientProject } from '@/types/client.types'
import { arr } from './dietStorage'

export function clientName(id: string): string {
  return CLIENTS.find((c) => c.id === id)?.name ?? id
}

// Diet Coord Workspace's admin-like set — diet-approvals.js:640-643.
export function isAdminLike(roleId: string): boolean {
  return ['admin', 'super_admin', 'om_diet', 'om_screening'].includes(roleId)
}

// Dietitian Payment's own admin-like set — dietitian-payment.js:53 explicitly
// includes 'accounts' ("everyone (read-only finance view)", per that file's
// own header comment) and does NOT include 'om_screening'. Distinct from the
// Diet Coord Workspace's isAdminLike() above — the two prototype screens
// genuinely define this differently; do not merge them into one list.
export function isPaymentAdminLike(roleId: string): boolean {
  return ['admin', 'super_admin', 'om_diet', 'accounts'].includes(roleId)
}

// resolveCoordinatorId() — matches the logged-in user's name against people
// whose role matches /coordinator|coord/i (case-insensitive), falling back
// to any exact-name match. om-data.js:501-511.
export function resolveCoordinatorId(userName: string): string | null {
  const name = (userName || '').trim().toLowerCase()
  if (!name) return null
  const coordTitled = PEOPLE.find((p) => /coordinator|coord/i.test(p.role) && p.name.trim().toLowerCase() === name)
  if (coordTitled) return coordTitled.id
  const anyMatch = PEOPLE.find((p) => p.name.trim().toLowerCase() === name)
  return anyMatch ? anyMatch.id : null
}

export function isCoordCamp(camp: Camp, coordId: string): boolean {
  if (camp.coordinatorId === coordId || camp.coordId === coordId) return true
  const proj = PROJECTS.find((p) => p.id === camp.projectId)
  return !!proj && proj.coordinatorId === coordId
}

export function coordScopedCamps(camps: Camp[], coordId: string): Camp[] {
  return camps.filter((c) => isCoordCamp(c, coordId))
}

export function coordScopedProjects(coordId: string): ClientProject[] {
  return PROJECTS.filter((p) => p.coordinatorId === coordId)
}

export function coordScopedClients(coordId: string) {
  const projIds = new Set(coordScopedProjects(coordId).map((p) => p.clientId))
  return CLIENTS.filter((c) => projIds.has(c.id))
}

// isDietProject() — pure-Diet or Mixed-with-Diet-subtype. diet-approvals.js's tabProjects().
export function isDietProject(p: ClientProject | undefined | null): boolean {
  if (!p) return false
  return p.type === 'Diet' || (p.type === 'Mixed' && arr(p.mixedSubTypes).includes('Diet'))
}
