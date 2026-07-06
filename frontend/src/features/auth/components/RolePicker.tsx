import RoleCard from './RoleCard'

export interface RoleConfig {
  id: string
  label: string
  description: string
  icon: string   // Lucide icon name
  color: string  // accent hex
  group: 'qms' | 'pharma'
}

export const QMS_INTERNAL_ROLES: RoleConfig[] = [
  { id: 'super_admin',     label: 'Super Admin',                group: 'qms',    icon: 'crown',                  color: '#f43f5e', description: 'Full org access · all modules · master data · RBAC' },
  { id: 'admin',           label: 'Admin',                      group: 'qms',    icon: 'shield-check',           color: '#8b5cf6', description: 'Tenant admin · masters · users · workflows' },
  { id: 'sales_lead',      label: 'Sales Head',                 group: 'qms',    icon: 'crown',                  color: '#3b6dff', description: 'Team pipeline · approvals · targets · appointments' },
  { id: 'sales_rep',       label: 'Key Account Manager',        group: 'qms',    icon: 'briefcase',              color: '#0ea5e9', description: 'My pipeline · request masters · my appointments · reports to Sales Head' },
  { id: 'camp_coord',      label: 'Screening Camp Coordinator', group: 'qms',    icon: 'tent',                   color: '#10b981', description: 'Screening camps · FO assignments · serviceability · reports to OM — Screening' },
  { id: 'diet_camp_coord', label: 'Diet Camp Coordinator',      group: 'qms',    icon: 'apple',                  color: '#10b981', description: 'Diet camps · dietitian assignment approvals · projects · reports to OM — Diet' },
  { id: 'om_screening',    label: 'OM · Screening',             group: 'qms',    icon: 'clipboard-check',        color: '#3b6dff', description: 'Screening camps · FO enrollment · device + camp assignment · expense approval · audit' },
  { id: 'om_diet',         label: 'OM · Diet',                  group: 'qms',    icon: 'clipboard-check',        color: '#10b981', description: 'Diet camps · FO enrollment · device + camp assignment · expense approval · audit' },
  { id: 'fo',              label: 'Field Officer',              group: 'qms',    icon: 'route',                  color: '#14b8a6', description: 'My camps · check-in · expenses · training · SOS · all 13 modules' },
  { id: 'dedicated_fo',    label: 'Dedicated FO',               group: 'qms',    icon: 'briefcase',              color: '#0ea5e9', description: 'Stationed at doctor clinic · daily check-in · patient screenings · SOP-gated compliance' },
  { id: 'logistics',       label: 'Logistics',                  group: 'qms',    icon: 'truck',                  color: '#f59e0b', description: 'Inventory control · warehouse · transfers · procurement · vendors · regional stock · asset lifecycle' },
  { id: 'accounts',        label: 'Accounts',                   group: 'qms',    icon: 'receipt-indian-rupee',   color: '#a855f7', description: 'AR · invoices · GRN · expenses · P&L · CFO dashboards · inventory valuation' },
  { id: 'dietitian',       label: 'Dietitian',                  group: 'qms',    icon: 'apple',                  color: '#10b981', description: 'My inventory · request consumables · report consumption · return excess · report expiry' },
  { id: 'analytics_viewer',label: 'Analytics Viewer',           group: 'qms',    icon: 'bar-chart-3',            color: '#0ea5e9', description: 'Read-only dashboards · reports library · exports' },
]

export const PHARMA_EXTERNAL_ROLES: RoleConfig[] = [
  { id: 'pharma_ho',  label: 'Pharma HO',  group: 'pharma', icon: 'building-2',   color: '#7c5cff', description: 'My division · RSM→ASM→MR hierarchy · division dashboard with patient + risk analytics' },
  { id: 'pharma_mr',  label: 'Pharma MR',  group: 'pharma', icon: 'user-round',   color: '#ec4899', description: 'My dashboard · book camps · add doctors · post-camp rating + Rx' },
  { id: 'pharma_asm', label: 'Pharma ASM', group: 'pharma', icon: 'users-round',  color: '#8b5cf6', description: 'My MR team · consolidated dashboard · book on behalf · serviceability-aware' },
  { id: 'pharma_rsm', label: 'Pharma RSM', group: 'pharma', icon: 'globe',        color: '#0ea5e9', description: 'My ASMs · region-wide rollup · book on behalf · serviceability-aware' },
]

interface RolePickerProps {
  selectedRole: string | null
  onSelect: (roleId: string) => void
}

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 my-4">
    <div className="flex-1 h-px bg-gray-200 dark:bg-[rgba(148,168,255,0.15)]" />
    <span className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-[#7b85b8] uppercase">{label}</span>
    <div className="flex-1 h-px bg-gray-200 dark:bg-[rgba(148,168,255,0.15)]" />
  </div>
)

const RolePicker = ({ selectedRole, onSelect }: RolePickerProps) => {
  return (
    <div>
      <SectionDivider label="QMS Internal" />
      <div className="grid grid-cols-2 gap-2">
        {QMS_INTERNAL_ROLES.map((role) => (

          <RoleCard key={role.id} role={role} selected={selectedRole === role.id} onSelect={onSelect} />
        ))}
      </div>

      <SectionDivider label="Pharma External" />
      <div className="grid grid-cols-2 gap-2">
        {PHARMA_EXTERNAL_ROLES.map((role) => (
          <RoleCard key={role.id} role={role} selected={selectedRole === role.id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

export default RolePicker
