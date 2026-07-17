import type { Camp } from '@/types/camp.types'

export interface SynthPatient {
  code: string
  age: number
  gender: 'M' | 'F' | 'Other'
  tests: string
  risk: 'HIGH' | 'BORDERLINE' | 'NORMAL'
  referred: boolean
  interpretation: string
}

// Deterministic PRNG seeded off the camp id, mirroring the prototype's
// synthesized-patient approach — same camp always produces the same rows.
function seededRandom(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}

function interpret(risk: SynthPatient['risk']): string {
  if (risk === 'HIGH') return 'Referred for specialist follow-up'
  if (risk === 'BORDERLINE') return 'Monitor · recheck in 3 months'
  return 'Within normal range'
}

export function synthesizePatients(camp: Camp): SynthPatient[] {
  const count = camp.patientCount || camp.patientsDone || 0
  if (count === 0) return []

  const rand = seededRandom(camp.id)
  const patients: SynthPatient[] = []

  for (let i = 0; i < count; i++) {
    const genderRoll = rand()
    const gender: SynthPatient['gender'] = genderRoll < 0.48 ? 'M' : genderRoll < 0.96 ? 'F' : 'Other'
    const riskRoll = rand()
    const risk: SynthPatient['risk'] = riskRoll < 0.12 ? 'HIGH' : riskRoll < 0.3 ? 'BORDERLINE' : 'NORMAL'

    patients.push({
      code: `${camp.id}-P${String(i + 1).padStart(3, '0')}`,
      age: 30 + Math.floor(rand() * 40),
      gender,
      tests: camp.type === 'Diet' ? 'BMI, Diet assessment' : 'BP, Sugar, ECG',
      risk,
      referred: risk === 'HIGH',
      interpretation: interpret(risk),
    })
  }

  return patients
}
