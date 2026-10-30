import { NavLink } from 'react-router-dom'
import { FiBarChart2, FiUsers, FiMapPin } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { getPharmaRoleMeta, PHARMA_ROUTES } from '@/features/pharma/pharma.constants'

interface SidebarNavLinkProps {
  to: string
  icon: IconType
  label: string
}

const SidebarNavLink = ({ to, icon: Icon, label }: SidebarNavLinkProps) => (
  <NavLink
    to={to}
    className={cn(
      'flex items-center gap-2.5 px-2.5 py-1.75 rounded-lg text-[13px] font-medium transition-all',
      'hover:bg-(--qms-surface-hover)',
    )}
    style={({ isActive }) =>
      isActive
        ? {
            color: 'var(--qms-text)',
            background: 'linear-gradient(135deg, rgba(36,81,240,.12), rgba(20,184,166,.08))',
            boxShadow: 'inset 0 0 0 1px var(--qms-border-strong)',
          }
        : { color: 'var(--qms-text-muted)' }
    }
  >
    <Icon size={16} className="shrink-0" />
    <span className="flex-1 truncate">{label}</span>
  </NavLink>
)

// Trimmed port of internal-frontend's Sidebar — that one drives an 18-role, dozens-of-module
// navRegistry (collapsible sections, AI Copilot panel). pharma-frontend has exactly 4 roles; each
// now has three routes (its own portal, Doctor Management, Camp Management), so this lists all
// three as plain NavLinks rather than building out a full navRegistry for a handful of items.
const Sidebar = () => {
  const { session } = useSession()
  const meta = getPharmaRoleMeta(session?.roleType?.code)

  return (
    <aside
      className="flex flex-col w-56 h-dvh sticky top-0 border-r shrink-0"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-center gap-2 px-3 py-3.5 border-b" style={{ borderColor: 'var(--qms-border)' }}>
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          Q
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold tracking-tight leading-none" style={{ color: 'var(--qms-text)' }}>QMS</div>
          <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Pharma Portal</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {meta && (
          <>
            <SidebarNavLink to={meta.portalPath} icon={FiBarChart2} label={`${meta.label} Portal`} />
            <SidebarNavLink to={PHARMA_ROUTES.DOCTOR_MANAGEMENT} icon={FiUsers} label="Doctor Management" />
            <SidebarNavLink to={PHARMA_ROUTES.CAMP_MANAGEMENT} icon={FiMapPin} label="Camp Management" />
          </>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
