// Client Management (CRM › Clients) domain types.
// TODO: entirely mock/frontend-only — no backend endpoints exist for clients yet.

export type ClientType = 'PHARMA' | 'HOSPITAL'
export type ClientStatus = 'ACTIVE' | 'TRIAL' | 'INACTIVE' | 'PAUSED'

export interface Client {
  id: string
  name: string
  type: ClientType
  city: string
  state: string
  /** Single letter rendered inside the colored initial chip */
  logo: string
  /** Brand hex used for the initial chip / tinted accents */
  color: string
  status: ClientStatus
  contact: string
  email: string
  phone: string
}

export interface Division {
  id: string
  clientId: string
  name: string
  therapy: string
}

// Client/division master data lives here (not clients.mock.ts) so any feature
// can read it through the shared types layer instead of reaching into Client
// Management's internal mock file. IDs line up with camps.mock.ts /
// dashboard.mock.ts / features/projects/projects.mock.ts so all four modules
// read as one dataset.
export const CLIENTS: Client[] = [
  { id: 'cli-sun', name: 'Sun Pharma', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'S', color: '#f59e0b', status: 'ACTIVE', contact: 'Rajesh Khanna', email: 'rajesh.khanna@sunpharma.com', phone: '+91 98200 11223' },
  { id: 'cli-cipla', name: 'Cipla', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'C', color: '#0ea5e9', status: 'ACTIVE', contact: 'Sneha Kulkarni', email: 'sneha.kulkarni@cipla.com', phone: '+91 98200 22334' },
  { id: 'cli-drr', name: "Dr Reddy's", type: 'PHARMA', city: 'Hyderabad', state: 'TS', logo: 'D', color: '#a855f7', status: 'ACTIVE', contact: 'Venkat Raman', email: 'venkat.raman@drreddys.com', phone: '+91 99490 33445' },
  { id: 'cli-lupin', name: 'Lupin', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'L', color: '#10b981', status: 'TRIAL', contact: 'Priya Nair', email: 'priya.nair@lupin.com', phone: '+91 98200 44556' },
  { id: 'cli-zydus', name: 'Zydus', type: 'PHARMA', city: 'Ahmedabad', state: 'GJ', logo: 'Z', color: '#f43f5e', status: 'INACTIVE', contact: 'Hardik Shah', email: 'hardik.shah@zyduslife.com', phone: '+91 98790 55667' },
  { id: 'cli-abbott', name: 'Abbott India', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'A', color: '#3b6dff', status: 'ACTIVE', contact: 'Kavita Rao', email: 'kavita.rao@abbott.com', phone: '+91 98200 66778' },
  { id: 'cli-fortis', name: 'Fortis Healthcare', type: 'HOSPITAL', city: 'Gurugram', state: 'HR', logo: 'F', color: '#14b8a6', status: 'PAUSED', contact: 'Amitabh Sinha', email: 'amitabh.sinha@fortishealthcare.com', phone: '+91 98110 77889' },
  { id: 'cli-glenmark', name: 'Glenmark', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'G', color: '#6366f1', status: 'ACTIVE', contact: 'Deepa Iyer', email: 'deepa.iyer@glenmark.com', phone: '+91 98200 88990' },
]

export const DIVISIONS: Division[] = [
  { id: 'div-sun-cardio', clientId: 'cli-sun', name: 'Cardio Care', therapy: 'Cardiology' },
  { id: 'div-sun-diabeto', clientId: 'cli-sun', name: 'DiabetoMax', therapy: 'Diabetes' },
  { id: 'div-cipla-resp', clientId: 'cli-cipla', name: 'Respiratory Care', therapy: 'Pulmonology' },
  { id: 'div-cipla-endo', clientId: 'cli-cipla', name: 'Endo Plus', therapy: 'Endocrinology' },
  { id: 'div-drr-onco', clientId: 'cli-drr', name: 'OncoCare', therapy: 'Oncology' },
  { id: 'div-drr-derma', clientId: 'cli-drr', name: 'DermaShield', therapy: 'Dermatology' },
  { id: 'div-zyd-cardio', clientId: 'cli-zydus', name: 'CardiaCare', therapy: 'Cardiology' },
  { id: 'div-abt-diab', clientId: 'cli-abbott', name: 'Diabetes Care', therapy: 'Diabetes' },
  { id: 'div-glen-derm', clientId: 'cli-glenmark', name: 'Dermatology', therapy: 'Dermatology' },
]

export type MrDesignation = 'Sr MR' | 'MR'

export interface MrServiceability {
  screening: { cities: string[] }
  diet: { cities: string[] }
  lab: { cities: string[] }
}

export interface ClientMr {
  id: string
  clientId: string
  divisionId: string
  name: string
  empCode: string
  designation: MrDesignation
  hq: string
  region: string
  /** Manager (ASM) name string — the division hierarchy tree is derived from this */
  manager: string
  phone: string
  email: string
  serviceability: MrServiceability
  campsBooked: number
  doctorsMapped: number
}

export type PoConfirmationType = 'PO' | 'AGREEMENT' | 'MAIL'
export type PoStatus = 'ACTIVE' | 'COMPLETED'

export interface PurchaseOrder {
  id: string
  poNo: string
  confirmationType: PoConfirmationType
  poDate: string
  poExpiry?: string
  campCount: number
  value: number
  status: PoStatus
}

export type ClientProjectType = 'Screening' | 'Diet' | 'Lab'
export type ClientProjectStatus = 'LIVE' | 'PILOT' | 'PAUSED'

export interface ClientProject {
  id: string
  name: string
  clientId: string
  divisionId: string | null
  type: ClientProjectType
  poNo: string
  poValueInr: number
  poDate: string
  campsTarget: number
  campsDone: number
  status: ClientProjectStatus
  pos: PurchaseOrder[]
}

export type InvoiceStatus = 'SENT' | 'PAID' | 'OVERDUE'

export interface ClientInvoice {
  id: string
  /** Invoices join to clients by NAME (not id) — mirrors the prototype's billing data quirk */
  clientName: string
  divisionId: string
  amount: number
  status: InvoiceStatus
  /** ISO date the invoice was raised — used for period filtering in Analytics/Today */
  date: string
  project: string
  /** ISO due date */
  due: string
  /** Days since due date (0 if not yet due) */
  age: number
}

export interface ClientDoctor {
  id: string
  name: string
  specialty: string
  city: string
}

export type HierarchyTier = 'ZM' | 'RM' | 'ASM' | 'MR'

export interface HierarchyNode {
  id: string
  label: string
  tier: HierarchyTier
  /** Only set on MR leaves — links the node back to the ClientMr record */
  mrId?: string
  memberCount: number
  children: HierarchyNode[]
}
