// Test master data (Admin → Master → Tests), scoped to the fields the Project
// wizard's "Tests to be conducted" chip picker needs. Codes/names/ids mirror
// the vanilla-JS prototype's admin-data.js TESTS seed exactly.

export interface ProjectTest {
  id: string
  code: string
  name: string
}

export const TESTS: ProjectTest[] = [
  { id: 'tst-fbs', code: 'FBS', name: 'Fasting Blood Sugar' },
  { id: 'tst-ppbs', code: 'PPBS', name: 'Post-prandial Blood Sugar' },
  { id: 'tst-rbs', code: 'RBS', name: 'Random Blood Sugar' },
  { id: 'tst-bp', code: 'BP', name: 'Blood Pressure' },
  { id: 'tst-spo2', code: 'SPO2', name: 'SpO2 (Oxygen Saturation)' },
  { id: 'tst-ecg', code: 'ECG', name: 'ECG (12-lead)' },
  { id: 'tst-lipid', code: 'LIPID', name: 'Lipid Profile' },
  { id: 'tst-hba1c', code: 'HbA1c', name: 'Glycated Haemoglobin' },
  { id: 'tst-spiro', code: 'SPIRO', name: 'Spirometry' },
  { id: 'tst-bca', code: 'BCA', name: 'Body Composition Analysis' },
]
