import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FieldLabelProps = React.ComponentProps<typeof Label>

// Recurring form-field label style across the access-management detail
// pages — small uppercase tracked label in muted text. Wraps Label rather
// than replacing it so htmlFor/children/etc. still work exactly the same.
const FieldLabel = ({ className, style, ...props }: FieldLabelProps) => (
  <Label
    className={cn('text-[10px] font-semibold tracking-widest uppercase mb-2', className)}
    style={{ color: 'var(--qms-text-muted)', ...style }}
    {...props}
  />
)

export default FieldLabel
