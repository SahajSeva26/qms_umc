import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TenantOption {
  id: string
  name: string
  code: string
}

interface TenantPickerProps {
  id?: string
  tenants: TenantOption[]
  value: string
  onValueChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
}

// Shared "Company" Select — used identically by RoleDetailPage.tsx,
// RoleTypeDetailPage.tsx, and CampDetailPageReal.tsx: a tenant list already
// fetched by the caller (useTenants call sites differ in `limit`/`enabled`
// per page, so the fetch itself stays with the caller, not this component),
// displayed as "{name} ({code})", with the same key={value || 'empty'}
// remount fix every base-ui Select in this codebase needs.
const TenantPicker = ({ id, tenants, value, onValueChange, disabled, placeholder = 'Select company' }: TenantPickerProps) => (
  <Select key={value || 'empty'} value={value || undefined} onValueChange={(v) => onValueChange(v ?? '')} disabled={disabled}>
    <SelectTrigger id={id} className="w-full">
      <SelectValue placeholder={placeholder}>
        {(v: string) => {
          const t = tenants.find((t) => t.id === v)
          return t ? `${t.name} (${t.code})` : placeholder
        }}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {tenants.map((t) => (
        <SelectItem key={t.id} value={t.id}>
          {t.name} ({t.code})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

export default TenantPicker
