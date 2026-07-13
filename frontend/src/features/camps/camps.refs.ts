// TODO: mock lookup tables for client/division names referenced by camps.mock.ts.
// Real data will come from the Clients/CRM module once it exists.

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
