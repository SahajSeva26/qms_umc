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

const noService: MrServiceability = { screening: { cities: [] }, diet: { cities: [] }, lab: { cities: [] } }

// MR master data lives here (not clients.mock.ts) so other features (e.g.
// doctors, for the "MRs covering this doctor" drawer section) can read it
// through the shared types layer instead of reaching into Client
// Management's internal mock file — same rationale as CLIENTS/DIVISIONS above.
export const MRS: ClientMr[] = [
  {
    id: 'mr-sun-cardio-1', clientId: 'cli-sun', divisionId: 'div-sun-cardio', name: 'Suresh Patil', empCode: 'SUN-0412',
    designation: 'Sr MR', hq: 'Mumbai', region: 'West', manager: 'Anil Joshi', phone: '+91 98220 10011', email: 'suresh.patil@sunpharma.com',
    serviceability: { screening: { cities: ['Mumbai', 'Thane', 'Pune'] }, diet: { cities: ['Mumbai', 'Thane'] }, lab: { cities: ['Mumbai'] } },
    campsBooked: 14, doctorsMapped: 46,
  },
  {
    id: 'mr-sun-cardio-2', clientId: 'cli-sun', divisionId: 'div-sun-cardio', name: 'Kiran Deshmukh', empCode: 'SUN-0587',
    designation: 'MR', hq: 'Pune', region: 'West', manager: 'Anil Joshi', phone: '+91 98220 10022', email: 'kiran.deshmukh@sunpharma.com',
    serviceability: { screening: { cities: ['Pune'] }, diet: { cities: ['Pune'] }, lab: { cities: [] } },
    campsBooked: 8, doctorsMapped: 22,
  },
  {
    id: 'mr-sun-diabeto-1', clientId: 'cli-sun', divisionId: 'div-sun-diabeto', name: 'Meena Kulkarni', empCode: 'SUN-0731',
    designation: 'MR', hq: 'Nashik', region: 'West', manager: 'Prakash Rane', phone: '+91 98220 10033', email: 'meena.kulkarni@sunpharma.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 0, doctorsMapped: 12,
  },
  {
    id: 'mr-cipla-resp-1', clientId: 'cli-cipla', divisionId: 'div-cipla-resp', name: 'Arjun Reddy', empCode: 'CIP-1104',
    designation: 'Sr MR', hq: 'Chennai', region: 'South', manager: 'Suresh Menon', phone: '+91 97910 20011', email: 'arjun.reddy@cipla.com',
    serviceability: { screening: { cities: ['Chennai', 'Coimbatore'] }, diet: { cities: ['Chennai'] }, lab: { cities: ['Chennai'] } },
    campsBooked: 11, doctorsMapped: 34,
  },
  {
    id: 'mr-cipla-resp-2', clientId: 'cli-cipla', divisionId: 'div-cipla-resp', name: 'Farhan Shaikh', empCode: 'CIP-1382',
    designation: 'MR', hq: 'Madurai', region: 'South', manager: 'Suresh Menon', phone: '+91 97910 20022', email: 'farhan.shaikh@cipla.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 2, doctorsMapped: 9,
  },
  {
    id: 'mr-cipla-endo-1', clientId: 'cli-cipla', divisionId: 'div-cipla-endo', name: 'Divya Hegde', empCode: 'CIP-1245',
    designation: 'Sr MR', hq: 'Bengaluru', region: 'South', manager: 'Ramesh Gowda', phone: '+91 98450 20033', email: 'divya.hegde@cipla.com',
    serviceability: { screening: { cities: ['Bengaluru', 'Mysuru'] }, diet: { cities: ['Bengaluru', 'Mysuru'] }, lab: { cities: ['Bengaluru'] } },
    campsBooked: 16, doctorsMapped: 51,
  },
  {
    id: 'mr-drr-onco-1', clientId: 'cli-drr', divisionId: 'div-drr-onco', name: 'Srinivas Rao', empCode: 'DRR-0218',
    designation: 'Sr MR', hq: 'Hyderabad', region: 'South', manager: 'Venkat Iyer', phone: '+91 99490 30011', email: 'srinivas.rao@drreddys.com',
    serviceability: { screening: { cities: ['Hyderabad', 'Vijayawada'] }, diet: { cities: [] }, lab: { cities: ['Hyderabad'] } },
    campsBooked: 9, doctorsMapped: 28,
  },
  {
    id: 'mr-drr-onco-2', clientId: 'cli-drr', divisionId: 'div-drr-onco', name: 'Kavya Nair', empCode: 'DRR-0356',
    designation: 'MR', hq: 'Visakhapatnam', region: 'South', manager: 'Venkat Iyer', phone: '+91 99490 30022', email: 'kavya.nair@drreddys.com',
    serviceability: { screening: { cities: ['Visakhapatnam'] }, diet: { cities: [] }, lab: { cities: [] } },
    campsBooked: 4, doctorsMapped: 15,
  },
  {
    id: 'mr-abt-diab-1', clientId: 'cli-abbott', divisionId: 'div-abt-diab', name: 'Rohit Malhotra', empCode: 'ABT-2041',
    designation: 'MR', hq: 'Mumbai', region: 'West', manager: 'Sanjay Kapoor', phone: '+91 98200 40011', email: 'rohit.malhotra@abbott.com',
    serviceability: { screening: { cities: ['Mumbai', 'Thane'] }, diet: { cities: ['Mumbai'] }, lab: { cities: ['Mumbai', 'Navi Mumbai'] } },
    campsBooked: 12, doctorsMapped: 39,
  },
  {
    id: 'mr-abt-diab-2', clientId: 'cli-abbott', divisionId: 'div-abt-diab', name: 'Neha Sharma', empCode: 'ABT-2288',
    designation: 'MR', hq: 'Indore', region: 'North', manager: 'Sanjay Kapoor', phone: '+91 98930 40022', email: 'neha.sharma@abbott.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 1, doctorsMapped: 7,
  },
  {
    id: 'mr-glen-derm-1', clientId: 'cli-glenmark', divisionId: 'div-glen-derm', name: 'Vishal Jain', empCode: 'GLN-0904',
    designation: 'Sr MR', hq: 'Mumbai', region: 'West', manager: 'Deepak Mehta', phone: '+91 98200 50011', email: 'vishal.jain@glenmark.com',
    serviceability: { screening: { cities: ['Mumbai'] }, diet: { cities: ['Mumbai'] }, lab: { cities: ['Mumbai', 'Pune'] } },
    campsBooked: 10, doctorsMapped: 31,
  },
]

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

export type ClientProjectType = 'Screening' | 'Diet' | 'Lab' | 'Mixed'
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
  /** Additional camp types a Mixed project covers, e.g. ['Diet'] on a
   * Screening-primary project that also runs diet camps — mirrors
   * diet-approvals.js's isDietProject() Mixed-subtype check. Only meaningful
   * when type === 'Mixed'. */
  mixedSubTypes?: ClientProjectType[]
  /** Diet Camp Coordinator assigned to this project — mirrors om-data.js's
   * project.coordinatorId, read by resolveCoordinatorId()/isCoordCamp(). */
  coordinatorId?: string
  /** Per-camp PO-budgeted cost, when a project sets this directly rather
   * than deriving it from poValueInr/campsTarget (diet-rates-modal.js's
   * poCampCost() priority chain checks this field first). */
  campCost?: number
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
