// FO Config Master's data model — per-project patient-field/test/consent/
// photo configuration plus a global clinical test master with interpretation
// rules. Shared by two consumers: the FO Config Master admin screen (which
// edits this) and My FO Workspace's Run Camp wizard (which reads it to drive
// live patient-screening forms). Mirrors the prototype's fo-config-master.js
// exactly. TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export interface PatientFieldDef {
  id: string
  label: string
  type: 'text' | 'number' | 'tel' | 'email' | 'date' | 'time' | 'select' | 'textarea' | 'radio' | 'file' | 'signature' | 'qr'
  required: boolean
  options?: string[]
  width?: '1-1' | '1-2' | '1-4'
  min?: number
  max?: number
  pattern?: string
  placeholder?: string
}

export interface PhotoRequirement {
  id: string
  label: string
  required: boolean
}

export interface ConsentConfig {
  type: 'signature' | 'otp' | 'upload'
  mandatory: boolean
  otpEnabled?: boolean
  uploadEnabled?: boolean
}

export interface EscalationConfig {
  delayMins: number
  critical: string
  missingReport: string
}

export interface FoProjectConfig {
  projectId: string
  projectName?: string
  therapyArea?: string
  clientId?: string
  patientFields: PatientFieldDef[]
  tests: string[]
  consent: ConsentConfig
  setupPhotos: PhotoRequirement[]
  additionalPhotos: PhotoRequirement[]
  mandatoryReportOnClose: boolean
  delayReasons: string[]
  checkinRadiusM: number
  faceMatch: boolean
  tatHours?: number
  escalation?: EscalationConfig
  updatedAt?: string
  seeded?: boolean
}

export type RuleLevel = 'critical' | 'high' | 'borderline' | 'normal' | 'low' | 'info'
export type RuleOp = '>' | '>=' | '<' | '<=' | '=' | 'between' | 'eq_text'

export interface TestRule {
  level: RuleLevel
  op: RuleOp
  value?: number | string
  from?: number
  to?: number
  message: string
  gender?: string
  ageMin?: number
  ageMax?: number
}

export type TestInputType = 'number' | 'text' | 'select' | 'positive_negative' | 'multiselect'

export interface FoTestDef {
  id: string
  name: string
  shortName?: string
  unit?: string
  refRange?: string
  inputType: TestInputType
  min?: number | null
  max?: number | null
  options?: string[]
  rules: TestRule[]
  system?: boolean
  updatedAt?: string
}

export interface ConsumableMapEntry {
  consumableId: string
  qtyPerTest: number
}

export interface InterpretationResult {
  level: RuleLevel
  critical: boolean
  message: string
  color: string
}

export const DEFAULT_PATIENT_FIELDS: PatientFieldDef[] = [
  { id: 'name', label: 'Patient name', type: 'text', required: true, width: '1-2' },
  { id: 'age', label: 'Age', type: 'number', required: true, width: '1-4', min: 0, max: 120 },
  { id: 'gender', label: 'Gender', type: 'select', required: true, width: '1-4', options: ['Male', 'Female', 'Other'] },
  { id: 'mobile', label: 'Mobile', type: 'tel', required: true, width: '1-2', pattern: '^[6-9]\\d{9}$' },
  { id: 'email', label: 'Email', type: 'email', required: false, width: '1-2' },
  { id: 'uhid', label: 'UHID', type: 'text', required: false, width: '1-2', placeholder: 'auto-generated if blank' },
  { id: 'address', label: 'Address', type: 'textarea', required: false, width: '1-1' },
]

export const DEFAULT_SETUP_PHOTOS: PhotoRequirement[] = [
  { id: 'machine', label: 'Diagnostic machine', required: true },
  { id: 'consumables', label: 'Consumable stock', required: true },
  { id: 'apron', label: 'FO apron / PPE', required: true },
  { id: 'branding', label: 'Camp branding', required: true },
  { id: 'desk', label: 'Camp registration desk', required: true },
]

export const DEFAULT_ADDITIONAL_PHOTOS: PhotoRequirement[] = [
  { id: 'crowd', label: 'Patient crowd / queue', required: false },
  { id: 'doctor', label: 'Doctor interaction', required: false },
  { id: 'device', label: 'Device in use', required: false },
  { id: 'team', label: 'Team photo', required: false },
]

export const DEFAULT_DELAY_REASONS: string[] = [
  'Traffic', 'Doctor delay', 'Material / kit issue', 'Personal emergency', 'Connectivity issue', 'Vehicle breakdown', 'Other',
]

export const LEVEL_COLOR: Record<RuleLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  borderline: '#d97706',
  normal: '#059669',
  low: '#0284c7',
  info: '#6b7280',
}

// 15-test seed master — ported exactly from fo-config-master.js's seedTests().
export const SEED_TESTS: FoTestDef[] = [
  { id: 'BP_SYS', name: 'Systolic BP', shortName: 'SBP', unit: 'mmHg', inputType: 'number', min: 60, max: 260, refRange: '90–120', system: true, rules: [
    { level: 'critical', op: '>=', value: 180, message: 'Hypertensive crisis. Refer immediately.' },
    { level: 'high', op: '>=', value: 140, message: 'Stage-2 hypertension. Doctor review.' },
    { level: 'borderline', op: 'between', from: 130, to: 139, message: 'Stage-1 hypertension. Counsel & monitor.' },
    { level: 'normal', op: '<', value: 130, message: 'Within normal range.' },
  ] },
  { id: 'BP_DIA', name: 'Diastolic BP', shortName: 'DBP', unit: 'mmHg', inputType: 'number', min: 40, max: 160, refRange: '60–80', system: true, rules: [
    { level: 'critical', op: '>=', value: 120, message: 'Diastolic crisis. Refer immediately.' },
    { level: 'high', op: '>=', value: 90, message: 'Stage-2 diastolic hypertension.' },
    { level: 'borderline', op: 'between', from: 80, to: 89, message: 'Stage-1 diastolic hypertension.' },
    { level: 'normal', op: '<', value: 80, message: 'Within normal range.' },
  ] },
  { id: 'HBA1C', name: 'HbA1c', shortName: 'HbA1c', unit: '%', inputType: 'number', min: 3, max: 18, refRange: '4.0–5.6', system: true, rules: [
    { level: 'critical', op: '>=', value: 10, message: 'Critical hyperglycaemia. Endocrine review.' },
    { level: 'high', op: '>=', value: 6.5, message: 'Diabetic range. Doctor follow-up required.' },
    { level: 'borderline', op: 'between', from: 5.7, to: 6.4, message: 'Pre-diabetic. Lifestyle counselling.' },
    { level: 'normal', op: '<', value: 5.7, message: 'Normal HbA1c.' },
  ] },
  { id: 'FBS', name: 'Fasting blood sugar', shortName: 'FBS', unit: 'mg/dL', inputType: 'number', min: 20, max: 600, refRange: '70–100', system: true, rules: [
    { level: 'critical', op: '>=', value: 300, message: 'Critical hyperglycaemia. Refer immediately.' },
    { level: 'high', op: '>=', value: 126, message: 'Diabetic FBS. Doctor review.' },
    { level: 'borderline', op: 'between', from: 100, to: 125, message: 'Impaired fasting glucose.' },
    { level: 'low', op: '<', value: 70, message: 'Hypoglycaemia. Counsel.' },
    { level: 'normal', op: 'between', from: 70, to: 99, message: 'Normal fasting glucose.' },
  ] },
  { id: 'RBS', name: 'Random blood sugar', shortName: 'RBS', unit: 'mg/dL', inputType: 'number', min: 20, max: 600, refRange: '80–140', system: true, rules: [
    { level: 'critical', op: '>=', value: 300, message: 'Critical hyperglycaemia. Refer immediately.' },
    { level: 'high', op: '>=', value: 200, message: 'Diabetic RBS. Doctor follow-up.' },
    { level: 'borderline', op: 'between', from: 140, to: 199, message: 'Borderline RBS.' },
    { level: 'normal', op: '<', value: 140, message: 'Within normal range.' },
  ] },
  { id: 'HT', name: 'Height', shortName: 'HT', unit: 'cm', inputType: 'number', min: 50, max: 230, system: true, rules: [] },
  { id: 'WT', name: 'Weight', shortName: 'WT', unit: 'kg', inputType: 'number', min: 10, max: 250, system: true, rules: [] },
  { id: 'BMI', name: 'BMI', shortName: 'BMI', unit: 'kg/m²', inputType: 'number', min: 8, max: 80, refRange: '18.5–24.9', system: true, rules: [
    { level: 'critical', op: '>=', value: 40, message: 'Severe obesity (class III). Endocrine review.' },
    { level: 'high', op: '>=', value: 30, message: 'Obesity. Lifestyle and dietary intervention.' },
    { level: 'borderline', op: 'between', from: 25, to: 29.9, message: 'Overweight. Counsel.' },
    { level: 'normal', op: 'between', from: 18.5, to: 24.9, message: 'Healthy BMI.' },
    { level: 'low', op: '<', value: 18.5, message: 'Underweight. Nutritional counselling.' },
  ] },
  { id: 'WAIST', name: 'Waist circumference', shortName: 'WC', unit: 'cm', inputType: 'number', min: 30, max: 200, refRange: 'M<90 / F<80', system: true, rules: [
    { level: 'high', op: '>=', value: 90, gender: 'Male', message: 'Abdominal obesity (male). Risk for metabolic syndrome.' },
    { level: 'high', op: '>=', value: 80, gender: 'Female', message: 'Abdominal obesity (female). Risk for metabolic syndrome.' },
    { level: 'normal', op: '<', value: 90, message: 'Within normal range.' },
  ] },
  { id: 'LIPID_TC', name: 'Total cholesterol', shortName: 'TC', unit: 'mg/dL', inputType: 'number', refRange: '<200', system: true, rules: [
    { level: 'high', op: '>=', value: 240, message: 'High cholesterol. Lipid clinic referral.' },
    { level: 'borderline', op: 'between', from: 200, to: 239, message: 'Borderline-high cholesterol.' },
    { level: 'normal', op: '<', value: 200, message: 'Desirable level.' },
  ] },
  { id: 'LIPID_LDL', name: 'LDL cholesterol', shortName: 'LDL', unit: 'mg/dL', inputType: 'number', refRange: '<100', system: true, rules: [
    { level: 'critical', op: '>=', value: 190, message: 'Very high LDL. Statin therapy review.' },
    { level: 'high', op: '>=', value: 160, message: 'High LDL.' },
    { level: 'borderline', op: 'between', from: 130, to: 159, message: 'Borderline-high LDL.' },
    { level: 'normal', op: '<', value: 130, message: 'Near-optimal / optimal LDL.' },
  ] },
  { id: 'LIPID_HDL', name: 'HDL cholesterol', shortName: 'HDL', unit: 'mg/dL', inputType: 'number', refRange: '>=40', system: true, rules: [
    { level: 'low', op: '<', value: 40, message: 'Low HDL. Increase physical activity.' },
    { level: 'normal', op: '>=', value: 40, message: 'Within healthy range.' },
  ] },
  { id: 'LIPID_TG', name: 'Triglycerides', shortName: 'TG', unit: 'mg/dL', inputType: 'number', refRange: '<150', system: true, rules: [
    { level: 'critical', op: '>=', value: 500, message: 'Very high TG. Risk of pancreatitis.' },
    { level: 'high', op: '>=', value: 200, message: 'High TG.' },
    { level: 'borderline', op: 'between', from: 150, to: 199, message: 'Borderline-high TG.' },
    { level: 'normal', op: '<', value: 150, message: 'Normal TG.' },
  ] },
  { id: 'ECG', name: 'ECG findings', shortName: 'ECG', inputType: 'select', system: true,
    options: ['Normal', 'Sinus tachycardia', 'Sinus bradycardia', 'ST elevation', 'ST depression', 'LBBB', 'RBBB', 'AF', 'Other'],
    rules: [
      { level: 'critical', op: 'eq_text', value: 'ST elevation', message: 'STEMI suspected. EMERGENCY REFERRAL.' },
      { level: 'high', op: 'eq_text', value: 'ST depression', message: 'Ischaemia suspected. Cardiology review.' },
      { level: 'high', op: 'eq_text', value: 'AF', message: 'Atrial fibrillation. Cardiology review.' },
      { level: 'normal', op: 'eq_text', value: 'Normal', message: 'Normal ECG.' },
    ] },
  { id: 'SPO2', name: 'SpO₂', shortName: 'SpO2', unit: '%', inputType: 'number', min: 60, max: 100, refRange: '95–100', system: true, rules: [
    { level: 'critical', op: '<', value: 90, message: 'Severe hypoxaemia. Refer immediately.' },
    { level: 'high', op: '<', value: 94, message: 'Mild hypoxaemia. Doctor review.' },
    { level: 'normal', op: '>=', value: 95, message: 'Normal saturation.' },
  ] },
]

// Seed consumable-per-test mapping (fo-config-master.js seedProjectsAndCons).
export const SEED_CONSUMABLE_MAP: Record<string, ConsumableMapEntry[]> = {
  HBA1C: [{ consumableId: 'HBA1C_STRIP', qtyPerTest: 1 }, { consumableId: 'LANCET', qtyPerTest: 1 }, { consumableId: 'ALCOHOL_SWAB', qtyPerTest: 1 }],
  FBS: [{ consumableId: 'GLUCOSE_STRIP', qtyPerTest: 1 }, { consumableId: 'LANCET', qtyPerTest: 1 }, { consumableId: 'ALCOHOL_SWAB', qtyPerTest: 1 }],
  RBS: [{ consumableId: 'GLUCOSE_STRIP', qtyPerTest: 1 }, { consumableId: 'LANCET', qtyPerTest: 1 }, { consumableId: 'ALCOHOL_SWAB', qtyPerTest: 1 }],
  LIPID_TC: [{ consumableId: 'LIPID_STRIP', qtyPerTest: 1 }, { consumableId: 'LANCET', qtyPerTest: 1 }, { consumableId: 'ALCOHOL_SWAB', qtyPerTest: 1 }],
  ECG: [{ consumableId: 'ECG_ELECTRODE', qtyPerTest: 10 }, { consumableId: 'ECG_PAPER', qtyPerTest: 1 }, { consumableId: 'CONDUCTIVE_GEL', qtyPerTest: 1 }],
  WAIST: [{ consumableId: 'TAPE_MEAS', qtyPerTest: 0 }],
}

// Default project→test mapping by camp/project type keyword (defaultConfig()).
export function defaultTestsForType(type: string): string[] {
  const t = (type || '').toLowerCase()
  if (t.includes('diab')) return ['HBA1C', 'FBS', 'RBS']
  if (t.includes('hyper') || t.includes('htn')) return ['BP_SYS', 'BP_DIA', 'BMI']
  if (t.includes('lipid')) return ['LIPID_TC', 'LIPID_LDL', 'LIPID_HDL', 'LIPID_TG']
  if (t.includes('cardiac') || t.includes('ecg')) return ['ECG', 'BP_SYS', 'BP_DIA', 'LIPID_TC']
  if (t.includes('obes') || t.includes('bmi')) return ['HT', 'WT', 'BMI', 'WAIST']
  if (t.includes('diet')) return ['HT', 'WT', 'BMI']
  return ['BP_SYS', 'BP_DIA', 'WT']
}
