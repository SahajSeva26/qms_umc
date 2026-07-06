import { useState } from 'react'
import { User, KeyRound, Building2, Fingerprint, Eye, EyeOff } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type React from 'react'
import type { RoleConfig } from './RolePicker'

interface CredentialsFormProps {
  selectedRole: RoleConfig
  onSubmit: (email: string, password: string) => void
  onBack: () => void
  isLoading: boolean
  error?: string
}

const toPascalCase = (str: string) =>
  str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')

const CredentialsForm = ({ selectedRole, onSubmit, onBack, isLoading, error }: CredentialsFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) onSubmit(email, password)
  }

  const iconName = toPascalCase(selectedRole.icon) as keyof typeof LucideIcons
  const RoleIcon = (LucideIcons[iconName] as React.ElementType) ?? LucideIcons.Circle

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-5">Sign in to your QMS workspace.</p>

      {/* Selected role badge */}
      <div
        className="flex items-start gap-3 px-3.5 py-3 rounded-xl mb-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${selectedRole.color} 6%, transparent)`,
          borderColor: `color-mix(in srgb, ${selectedRole.color} 25%, transparent)`,
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: `color-mix(in srgb, ${selectedRole.color} 15%, transparent)`,
            color: selectedRole.color,
          }}
        >
          <RoleIcon size={15} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">{selectedRole.label}</div>
          <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{selectedRole.description}</div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold shrink-0 mt-0.5 transition-colors hover:opacity-70"
          style={{ color: selectedRole.color }}
        >
          Change role
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
            Employee ID or Email
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="EMP00123 or you@qms.health"
              className="w-full pl-9 pr-3 py-2.5 text-sm font-medium border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400 placeholder:font-normal bg-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
            Password
          </label>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2.5 text-sm font-medium border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400 placeholder:font-normal bg-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" defaultChecked className="rounded" />
            Remember this device
          </label>
          <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            Forgot?
          </a>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full py-3 px-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, #3b6dff 0%, #0ea5e9 100%)',
          }}
        >
          {isLoading ? 'Signing in...' : 'Continue →'}
        </button>
      </form>

      <div className="flex items-center justify-center gap-1.5 mt-4">
        <span className="text-xs text-gray-400">New employee?</span>
        <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          Activate account →
        </a>
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or continue with</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
          <Building2 size={14} className="text-gray-400" />
          Pharma SSO
        </button>
        <button className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
          <Fingerprint size={14} className="text-gray-400" />
          Biometric
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">© QMS Health Platforms</span>
        <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all">
          <LucideIcons.Moon size={13} />
        </button>
      </div>
    </div>
  )
}

export default CredentialsForm
