import { NavLink } from 'react-router-dom'
import { FiBarChart2 } from 'react-icons/fi'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'

// Trimmed port of internal-frontend's Sidebar — that one drives an 18-role, dozens-of-module
// navRegistry (collapsible sections, AI Copilot panel). pharma-frontend has exactly 4 roles, each
// with exactly one portal route, so there's nothing for a navRegistry to register yet: this just
// shows the caller's own route as a persistent "you are here" entry, ready to grow per-role once
// a role gets a second route.
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
          <NavLink
            to={meta.portalPath}
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
            <FiBarChart2 size={16} className="shrink-0" />
            <span className="flex-1 truncate">{meta.label} Portal</span>
          </NavLink>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
