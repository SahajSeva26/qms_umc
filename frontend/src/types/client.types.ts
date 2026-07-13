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
