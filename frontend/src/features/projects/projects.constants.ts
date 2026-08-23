import type {
  ProjectTherapy,
  ProjectType,
  ProjectTest,
  ExecutionModeType,
  ProjectStatus,
  PaymentTerms,
  ClientReportCadence,
  AvailablePointer,
  GoLiveScopeCode,
} from '@/features/projects/project.types'

// Runtime label/color/transition-map constants for the Project domain —
// split out of project.types.ts so type declarations aren't bundled with
// runtime values.

export const PROJECT_THERAPY_LABEL: Record<ProjectTherapy, string> = {
  cardiology: 'Cardiology',
  diabetes: 'Diabetes',
  pulmonology: 'Pulmonology',
  endocrine: 'Endocrine',
  orthopedics: 'Orthopedics',
  gynaecology: 'Gynaecology',
  neurology: 'Neurology',
  hepatology: 'Hepatology',
  nephrology: 'Nephrology',
}

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  screening_camp: 'Screening Camp',
  diet: 'Diet',
  teleconsultation_diet: 'Teleconsultation Diet',
  lab_test: 'Lab Test',
  mixed: 'Mixed',
}

export const PROJECT_TEST_LABEL: Record<ProjectTest, string> = {
  fbs: 'FBS',
  ppbs: 'PPBS',
  rbs: 'RBS',
  bp: 'BP',
  spo2: 'SPO2',
  ecg: 'ECG',
  lipid: 'Lipid',
  hba1c: 'HbA1c',
  spiro: 'Spiro',
  bca: 'BCA',
}

export const EXECUTION_MODE_LABEL: Record<ExecutionModeType, string> = {
  po: 'PO Based',
  agreement: 'Agreement Based',
  mail_confirmation: 'Mail Confirmation',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  new: 'New',
  live: 'Live',
  hold: 'Hold',
  closed: 'Closed',
}

// Not defined server-side — one consistent swatch per status for pills.
export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  new: '#3b6dff',
  live: '#10b981',
  hold: '#f59e0b',
  closed: '#94a3b8',
}

// The only legal `to` values from a given current `status`. `closed` is terminal.
export const PROJECT_STAGE_TRANSITION_MAP: Record<ProjectStatus, ProjectStatus[]> = {
  new: ['live', 'hold', 'closed'],
  live: ['hold', 'closed'],
  hold: ['live', 'closed'],
  closed: [],
}

export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = {
  net_30: 'Net 30',
  net_60: 'Net 60',
  net_90: 'Net 90',
}

export const CLIENT_REPORT_CADENCE_LABEL: Record<ClientReportCadence, string> = {
  weekly: 'Weekly',
  half_monthly: 'Half-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  halfyearly: 'Half-yearly',
  yearly: 'Yearly',
}

export const AVAILABLE_POINTER_LABEL: Record<AvailablePointer, string> = {
  camp_executed: 'Camps executed',
}

export const GO_LIVE_SCOPE_LABEL: Record<GoLiveScopeCode, string> = {
  states: 'Specific states',
  cities: 'Specific cities',
  pan: 'PAN-India',
}
