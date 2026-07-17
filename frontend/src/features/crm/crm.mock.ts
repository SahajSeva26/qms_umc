import type { Lead, Owner, KpiTile } from '@/types/lead.types'
import { STAGES, LOST_STAGE, LOST_CATEGORIES } from '@/types/lead.types'

// TODO: entirely mock — no backend endpoints exist for CRM yet.
// Stage set / KPI config / field ranges copied from the vanilla-JS prototype's
// crm-data.js so structure matches the design reference. Individual lead
// records are freshly generated (not the prototype's exact seeded-RNG values)
// since bit-exact reproduction isn't meaningful — field shapes/ranges are.

// Re-exported for existing in-feature imports — the canonical definitions now
// live in types/lead.types.ts so other features can read them without
// reaching into this mock file.
export { STAGES, LOST_STAGE, LOST_CATEGORIES }

export const STAGE_ORDER: Lead['stage'][] = ['new', 'quotation', 'negotiation', 'won']

export const THERAPIES = [
  'Cardiology', 'Diabetes', 'Pulmonology', 'Neurology', 'Orthopedics', 'Gynecology',
  'Gastroenterology', 'Dermatology', 'Nephrology', 'Oncology',
]

export const OWNERS: Owner[] = [
  { name: 'Riya Mehta', initials: 'RM', tone: 'brand', role: 'Sr. Sales' },
  { name: 'Arjun Kapoor', initials: 'AK', tone: 'teal', role: 'Sales Head' },
  { name: 'Sneha Nair', initials: 'SN', tone: 'violet', role: 'Sales Mgr.' },
  { name: 'Vikram Pillai', initials: 'VP', tone: 'amber', role: 'KAM' },
  { name: 'Neha Iyer', initials: 'NE', tone: 'emerald', role: 'Sales' },
  { name: 'Rohit Gupta', initials: 'RG', tone: 'rose', role: 'Sales' },
]

export const PROJECT_TYPES = ['Screening', 'Diet', 'TeleDiet', 'Lab', 'Mixed']

export const CURRENT_ACTIVITIES = [
  'Doctor meets', 'Diet camps', 'PSP', 'Combination', 'CME/RTM events', 'Digital campaigns',
  'Field force reach', 'Sample distribution', 'Teleconsultation', 'Screening camps', 'None', 'Other',
]

export const QMS_OFFERINGS = [
  'Screening Camp', 'Diet Camp', 'Lab Camp', 'Teleconsultation', 'WhatsApp Bot',
  'Field Officer Deployment', 'Device Rental', 'Patient Reminder Engine',
]

const ACCOUNTS = ['Sun Pharma', 'Cipla', "Dr Reddy's", 'Abbott India', 'Lupin', 'Zydus', 'Glenmark', 'Fortis Healthcare']
const DIVISIONS = ['Cardio', 'Endo', 'Pulmo', 'Neuro', 'Ortho', 'Gastro', 'Derm', 'GP-Care']
const CITIES: [string, string][] = [
  ['Mumbai', 'MH'], ['Pune', 'MH'], ['Bangalore', 'KA'], ['Chennai', 'TN'], ['Delhi NCR', 'DL'],
  ['Ahmedabad', 'GJ'], ['Kolkata', 'WB'], ['Hyderabad', 'TS'],
]
const VENDORS = ['IQVIA', 'HealthOps', 'MedPlus Field', '— None —']

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function scoreForStage(stage: Lead['stage'], rand: () => number): number {
  const ranges: Record<Lead['stage'], [number, number]> = {
    new: [35, 70],
    quotation: [60, 88],
    negotiation: [78, 95],
    won: [85, 98],
    lost: [30, 60],
  }
  const [min, max] = ranges[stage]
  return Math.round(min + rand() * (max - min))
}

function generateLeads(): Lead[] {
  const rand = seededRandom(42)
  const stagePool: Lead['stage'][] = ['new', 'new', 'new', 'quotation', 'quotation', 'negotiation', 'won', 'lost']
  const leads: Lead[] = []

  for (let i = 0; i < 32; i++) {
    const account = ACCOUNTS[Math.floor(rand() * ACCOUNTS.length)]
    const division = DIVISIONS[Math.floor(rand() * DIVISIONS.length)]
    const therapy = THERAPIES[Math.floor(rand() * THERAPIES.length)]
    const [city, state] = CITIES[Math.floor(rand() * CITIES.length)]
    const owner = OWNERS[Math.floor(rand() * OWNERS.length)]
    const stage = stagePool[Math.floor(rand() * stagePool.length)]
    const value = Math.round(8 + rand() * 212) * 100_000
    const age = Math.floor(3 + rand() * 40)
    const createdDaysAgo = age + Math.floor(rand() * 10)

    const created = new Date(Date.now() - createdDaysAgo * 86400000).toISOString().slice(0, 10)
    const updated = new Date(Date.now() - Math.floor(rand() * age) * 86400000).toISOString().slice(0, 10)

    const lead: Lead = {
      id: `L-${2400 + i}`,
      account,
      contact: `Dr. ${['Ramesh', 'Sneha', 'Vivek', 'Anjali', 'Kavita', 'Manish', 'Priya', 'Arvind'][i % 8]} ${['Sharma', 'Iyer', 'Rao', 'Mehta', 'Patel', 'Gupta', 'Nair', 'Bose'][i % 8]}`,
      contactRole: ['Brand Mgr', 'Marketing Head', 'GM Sales', 'Therapy Head', 'MR Lead'][i % 5],
      email: `contact${i}@${account.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone: `+91 9${String(100000000 + i * 137).slice(0, 9)}`,
      division,
      therapy,
      brand: `${therapy.slice(0, 4)}${['card', 'max', 'cort', 'one'][i % 4]}`,
      targetDoctors: Math.floor(40 + rand() * 220),
      existingActivity: ['Doctor meets', 'Diet camps', 'PSP', 'Combination', 'None'][i % 5],
      currentVendor: VENDORS[i % VENDORS.length],
      problem: `${division} division needs coverage expansion in ${city} — current vendor gaps on TAT and reach.`,
      geography: `${city} · ${state}`,
      city,
      state,
      competitor: VENDORS[i % VENDORS.length],
      value,
      stage,
      score: scoreForStage(stage, rand),
      owner: owner.name,
      ownerInitials: owner.initials,
      ownerTone: owner.tone,
      ownerRole: owner.role,
      age,
      nextAction: ['Send proposal v2', 'Confirm assessment call', 'Trigger project setup', 'Pricing approval', 'Schedule demo'][i % 5],
      nextDue: ['Today', 'Tomorrow', '3d', '5d', '1w'][i % 5],
      source: ['Inbound', 'Referral', 'Existing Client', 'Cold Call', 'LinkedIn'][i % 5],
      created,
      updated,
      tags: [therapy, division].filter(Boolean),
    }

    if (stage === 'lost') {
      lead.lostCategory = LOST_CATEGORIES[i % LOST_CATEGORIES.length]
      lead.lostReason = 'Client deferred decision to next fiscal year.'
    }

    leads.push(lead)
  }

  return leads
}

export const LEADS: Lead[] = generateLeads()

// KPI config — matches the prototype's structure (label/tone/icon/fmt), but
// values are recomputed live in useLeads.ts, not hardcoded here, since the
// real code's win-rate/velocity/top-rep tiles were partly-static in a way
// that's more confusing than useful to replicate exactly.
export const KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'pipe', label: 'Pipeline Value', tone: 'brand', icon: 'TrendingUp', fmt: 'inr' },
  { id: 'open', label: 'Open Opportunities', tone: 'violet', icon: 'Briefcase', fmt: 'num' },
  { id: 'won', label: 'Won MTD', tone: 'emerald', icon: 'CheckCircle', fmt: 'inr' },
  { id: 'wr', label: 'Win Rate', tone: 'teal', icon: 'Target', fmt: 'pct' },
  { id: 'aov', label: 'Avg Deal Size', tone: 'amber', icon: 'DollarSign', fmt: 'inr' },
  { id: 'vel', label: 'Sales Velocity', tone: 'brand', icon: 'Gauge', fmt: 'raw' },
  { id: 'aiscore', label: 'Avg AI Score', tone: 'violet', icon: 'Zap', fmt: 'num' },
  { id: 'top', label: 'Top Rep', tone: 'rose', icon: 'Award', fmt: 'raw' },
]
