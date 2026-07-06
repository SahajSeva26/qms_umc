import type React from 'react'
import { cn } from '@/lib/utils'
import type { RoleConfig } from './RolePicker'
import * as LucideIcons from 'lucide-react'

interface RoleCardProps {
  role: RoleConfig
  selected: boolean
  onSelect: (roleId: string) => void
}

const toPascalCase = (str: string) =>
  str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')

const RoleCard = ({ role, selected, onSelect }: RoleCardProps) => {
  const iconName = toPascalCase(role.icon) as keyof typeof LucideIcons
  const Icon = (LucideIcons[iconName] as React.ElementType) ?? LucideIcons.Circle

  return (
    <button
      onClick={() => onSelect(role.id)}
      className={cn(
        'w-full text-left p-2.5 pt-4 rounded-xl border transition-all duration-150 cursor-pointer group overflow-hidden relative',
        'hover:-translate-y-px',
        selected ? 'shadow-sm' : 'border-gray-200 bg-white hover:border-opacity-50'
      )}
      style={
        selected
          ? {
              borderColor: role.color,
              backgroundColor: `color-mix(in srgb, ${role.color} 7%, transparent)`,
              boxShadow: `0 0 0 3px color-mix(in srgb, ${role.color} 18%, transparent)`,
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = `${role.color}70`
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = ''
          e.currentTarget.style.boxShadow = ''
        }
      }}
    >
      {/* Colored top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl"
        style={{ background: `linear-gradient(to right, ${role.color}, transparent)` }}
      />

      <div className="flex items-start gap-2.5 pt-1">
        {/* Icon */}
        <div
          className="mt-0.5 w-8.5 h-8.5 rounded-[10px] flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${role.color} 12%, transparent)`,
            color: role.color,
          }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>

        {/* Text */}
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-gray-900 leading-tight">
            {role.label}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            {role.description}
          </div>
        </div>
      </div>
    </button>
  )
}

export default RoleCard
