import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import PasswordInput from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { useTenantWizardFieldError } from '@/features/access-management/tenant/components/wizard/TenantWizardValidationContext'
import type { TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'

const TenantOwnerStep = () => {
  const { register } = useFormContext<TenantFormValues>()
  const fieldError = useTenantWizardFieldError()

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Owner account
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ownerFirstName" className="text-xs mb-1.5">
              First name *
            </Label>
            <Input id="ownerFirstName" type="text" {...register('ownerFirstName')} />
            {fieldError('ownerFirstName') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerFirstName')}</p>}
          </div>
          <div>
            <Label htmlFor="ownerLastName" className="text-xs mb-1.5">
              Last name
            </Label>
            <Input id="ownerLastName" type="text" {...register('ownerLastName')} />
          </div>
        </div>
        <div>
          <Label htmlFor="ownerEmail" className="text-xs mb-1.5">
            Email *
          </Label>
          <Input id="ownerEmail" type="email" autoComplete="off" {...register('ownerEmail')} />
          {fieldError('ownerEmail') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerEmail')}</p>}
        </div>
        <div>
          <Label htmlFor="ownerPassword" className="text-xs mb-1.5">
            Password *
          </Label>
          <PasswordInput id="ownerPassword" autoComplete="new-password" {...register('ownerPassword')} />
          {fieldError('ownerPassword') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerPassword')}</p>}
        </div>
        <div>
          <Label htmlFor="ownerPhone" className="text-xs mb-1.5">
            Phone
          </Label>
          <Input id="ownerPhone" type="text" placeholder="Optional" {...register('ownerPhone')} />
        </div>
      </div>
    </div>
  )
}

export default TenantOwnerStep
