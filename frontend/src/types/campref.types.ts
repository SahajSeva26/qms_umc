// Client/division/FO name-lookup tables — mock reference data referenced by
// camp records across multiple features (Camp Management, Ops Manager, Diet
// Camps, Dedicated Ops). Lives here (not features/camps/camps.refs.ts) so
// any feature can read it through the shared types layer instead of
// reaching into Camp Management's internals — same pattern as
// CLIENTS/DIVISIONS/STAGES/QUARTER/ASSIGNMENTS.
// TODO: real data will come from the Clients/CRM module once it exists —
// note this is a SEPARATE id space from types/client.types.ts's real
// CLIENTS/DIVISIONS master (e.g. 'cli-drreddys' here vs 'cli-drr' there);
// reconciling the two is a real migration, not a quick fix, since existing
// camp mock data across several features is keyed to these exact ids.

export const CLIENT_NAMES: Record<string, string> = {
  'cli-sun': 'Sun Pharma',
  'cli-cipla': 'Cipla',
  'cli-drreddys': "Dr Reddy's",
  'cli-abbott': 'Abbott India',
  'cli-glenmark': 'Glenmark',
  'cli-lupin': 'Lupin',
  'cli-fortis': 'Fortis Healthcare',
}

export const DIVISION_NAMES: Record<string, string> = {
  'div-sun-cardio': 'Cardio Care',
  'div-cipla-resp': 'Respiratory Care',
  'div-cipla-endo': 'Endo Plus',
  'div-glen-derm': 'Dermatology',
  'div-abt-diab': 'Diabetes Care',
  'div-drr-onco': 'OncoCare',
}

export const FO_NAMES: Record<string, string> = {
  'p-ravi': 'Ravi Kumar',
  'p-anita': 'Anita Desai',
  'p-amit': 'Amit Singh',
  'p-pooja': 'Pooja S.',
}

export function clientName(id: string): string {
  return CLIENT_NAMES[id] ?? id
}

export function divisionName(id?: string | null): string {
  if (!id) return '—'
  return DIVISION_NAMES[id] ?? id
}

export function foName(id?: string): string {
  if (!id) return ''
  return FO_NAMES[id] ?? id
}
