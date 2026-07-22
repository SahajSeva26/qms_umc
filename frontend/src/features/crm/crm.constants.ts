// Shared option lists used by both the New Lead wizard and the Edit Lead
// modal — extracted here so the edit form doesn't duplicate (and risk
// drifting from) the wizard's own lists. None of these are backend-defined
// enums; they're free-text chip values the prototype's own wizard used.

export const THERAPIES = [
  'Cardiology', 'Diabetes', 'Pulmonology', 'Neurology', 'Orthopedics', 'Gynecology',
  'Gastroenterology', 'Dermatology', 'Nephrology', 'Oncology',
]

export const SPECIALTIES = [
  'Cardiologist', 'Endocrinologist', 'Pulmonologist', 'Neurologist', 'Orthopedic', 'Gynecologist',
  'Gastroenterologist', 'Dermatologist', 'Nephrologist', 'Oncologist', 'GP', 'CP',
]

export const CURRENT_ACTIVITIES = [
  'Doctor meets', 'Diet camps', 'PSP', 'Combination', 'CME/RTM events', 'Digital campaigns',
  'Field force reach', 'Sample distribution', 'Teleconsultation', 'Screening camps', 'None',
]

// Offering identifiers sent as LeadOffer.code — no backend-defined catalog
// exists for these, so the code is a stable slug derived from the label.
export const QMS_OFFERINGS: { code: string; label: string }[] = [
  { code: 'screening_camp', label: 'Screening Camp' },
  { code: 'diet_camp', label: 'Diet Camp' },
  { code: 'lab_camp', label: 'Lab Camp' },
  { code: 'teleconsultation', label: 'Teleconsultation' },
  { code: 'whatsapp_bot', label: 'WhatsApp Bot' },
  { code: 'field_officer_deployment', label: 'Field Officer Deployment' },
  { code: 'device_rental', label: 'Device Rental' },
  { code: 'patient_reminder_engine', label: 'Patient Reminder Engine' },
]
