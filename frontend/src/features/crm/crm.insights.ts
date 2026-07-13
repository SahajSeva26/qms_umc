// TODO: mock — matches the prototype's behavior of showing the same static
// AI recommendation/ROI/activity content for every lead (confirmed via
// research: not lead-specific in the real code either).

export const AI_RECOMMENDATIONS = [
  { service: 'Screening Camp', estimate: '~40 camps · 3,200 patients over 6mo', confidence: 92 },
  { service: 'Lab Camp', estimate: '~18 camps · 1,100 patients over 6mo', confidence: 84 },
  { service: 'WhatsApp Bot', estimate: 'Automated reminders for 5,000+ contacts', confidence: 71 },
  { service: 'Diet Program', estimate: '~12 camps · 640 patients over 6mo', confidence: 58 },
]

export const ROI_ESTIMATE = {
  rxUplift: '+18–24%',
  patientReach: '~3,120',
  payback: '3.4 mo',
  confidence: '82%',
}

export const ACTIVITY_TIMELINE = [
  { actor: 'Riya Mehta', action: 'Discovery call completed', at: '2 days ago' },
  { actor: 'System', action: 'Automated follow-up email sent', at: '3 days ago' },
  { actor: 'AI Engine', action: 'Recommendation generated', at: '4 days ago' },
  { actor: 'Riya Mehta', action: 'Meeting scheduled with contact', at: '6 days ago' },
  { actor: 'Riya Mehta', action: 'Note added: budget confirmed for Q2', at: '8 days ago' },
  { actor: 'System', action: 'Lead created', at: '12 days ago' },
]
