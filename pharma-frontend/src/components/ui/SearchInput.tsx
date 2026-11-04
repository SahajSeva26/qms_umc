import { FiSearch } from 'react-icons/fi'
import { Input } from '@qms/ui'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  wrapperClassName?: string
}

// Shared search-box (icon + text input) used across filter bars — callers still own their own
// debouncing. Mirrors internal-frontend's SearchInput.tsx, using @qms/ui's Input.
const SearchInput = ({ value, onChange, placeholder, className, wrapperClassName }: SearchInputProps) => (
  <div className={cn('relative', wrapperClassName)}>
    <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('pl-7', className)}
    />
  </div>
)

export default SearchInput
