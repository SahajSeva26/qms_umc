import type { Person } from '@/types/people.types'

// Shared by RosterTab/AssignmentsTab/PerformanceTab/DevicesTab/TrainingTab/PersonnelTab —
// same name+hq+phone substring match every tab already implemented independently.
export function foMatchesSearch(f: Pick<Person, 'name' | 'hq' | 'phone'>, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  return `${f.name} ${f.hq} ${f.phone}`.toLowerCase().includes(q)
}
