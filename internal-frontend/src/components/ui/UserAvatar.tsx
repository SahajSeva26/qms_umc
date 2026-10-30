const TONE_GRADIENTS: Record<string, string> = {
  brand:   'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))',
  teal:    'linear-gradient(135deg, var(--qms-teal), #0ea5e9)',
  violet:  'linear-gradient(135deg, var(--qms-role-admin), #ec4899)',
  amber:   'linear-gradient(135deg, var(--qms-role-logistics), #ef4444)',
  emerald: 'linear-gradient(135deg, #10b981, var(--qms-teal))',
  rose:    'linear-gradient(135deg, var(--qms-role-super-admin), var(--qms-role-admin))',
}

interface UserAvatarProps {
  firstName?: string
  lastName?: string
  tone?: string
  size?: 'sm' | 'md' | 'lg'
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

const UserAvatar = ({ firstName, lastName, tone = 'brand', size = 'md' }: UserAvatarProps) => {
  const initials = getInitials(firstName, lastName)
  const gradient = TONE_GRADIENTS[tone] ?? TONE_GRADIENTS.brand

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${SIZE_CLASSES[size]}`}
      style={{ background: gradient }}
    >
      {initials}
    </div>
  )
}

export default UserAvatar
