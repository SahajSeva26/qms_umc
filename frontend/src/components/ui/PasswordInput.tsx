import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

// Drop-in replacement for `<Input type="password" />` with a show/hide
// toggle — same shadcn recipe as LoginForm.tsx's hand-rolled version
// (FiEye/FiEyeOff, absolutely-positioned toggle button), just built on the
// shared Input/Button so every non-auth password field gets it for free
// instead of re-implementing local useState each time.
const PasswordInput = ({ className, ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-8', className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-transparent"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <FiEyeOff size={14} /> : <FiEye size={14} />}
      </Button>
    </div>
  )
}

export default PasswordInput
