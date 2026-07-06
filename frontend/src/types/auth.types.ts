export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'sales_lead'
  | 'sales_rep'
  | 'camp_coord'
  | 'diet_camp_coord'
  | 'om_screening'
  | 'om_diet'
  | 'fo'
  | 'dedicated_fo'
  | 'logistics'
  | 'accounts'
  | 'dietitian'
  | 'analytics_viewer'
  | 'pharma_ho'
  | 'pharma_rsm'
  | 'pharma_asm'
  | 'pharma_mr'

export interface AuthUser {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatar?: { url: string }
}

export interface LoginPayload {
  email: string
  password: string
}
