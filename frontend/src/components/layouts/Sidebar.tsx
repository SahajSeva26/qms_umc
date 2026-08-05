import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FiGrid, FiTrendingUp, FiNavigation, FiActivity, FiBarChart2,
  FiCalendar, FiUsers, FiBriefcase, FiFolderPlus, FiSliders,
  FiClipboard, FiSun, FiVideo, FiHeart, FiDollarSign, FiUserCheck,
  FiSettings, FiMapPin, FiAlertTriangle, FiCpu, FiGlobe, FiUser,
  FiPackage, FiBox, FiFileText, FiShield, FiZap, FiMessageSquare,
  FiChevronsLeft, FiChevronDown, FiCircle,
} from 'react-icons/fi'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import {
  getNavForRole,
  FULL_NAV_SECTIONS,
  type NavItem,
  type NavSection,
} from './navConfig'

// Existing FULL_NAV_SECTIONS items (the legacy 'ALL' tree every account
// currently renders, per the super_admin-fallback bug documented below)
// whose ROUTE is actually wrapped in RequirePermission — i.e. clicking them
// is not just "probably fine," it's really gated, and the account seeing
// them may not actually be able to get in. Without this map, those items
// show as dead links: visible in the sidebar, but bounced to /unauthorized
// on click (confirmed live for a tenant:admin-only account seeing "CRM").
// Every OTHER item in FULL_NAV_SECTIONS has no real permission code to
// check at all yet (no RequirePermission on its route), so it's correctly
// left alone — hiding those would have no real backend backing them and
// would just be guessing.
//
// Mirrors each route's own guard exactly:
//   crm.routes.tsx: CRM_VIEW_PERMISSIONS
//   accessManagement.routes.tsx: TENANTS_/PERMISSION_GROUPS_/ROLE_TYPES_/ROLES_VIEW_PERMISSIONS
const REAL_GATED_NAV_ITEMS: Record<string, string[]> = {
  crm: ['lead:search', 'lead:manage', 'tenant:manage'],
  tenants: ['tenant:get', 'tenant:search', 'tenant:manage'],
  permissiongroups: ['permission-group:get', 'permission-group:search', 'permission-group:manage'],
  roletypes: ['role-type:get', 'role-type:search', 'role-type:manage'],
  roles: ['role:get', 'role:search', 'role:manage'],
  qafeedback: ['qa-feedback:manage'],
  // Matches appointment.routes.ts's READ_GUARD and contacts.routes.tsx's
  // CONTACT_VIEW_PERMISSIONS exactly — added 2026-07-27 alongside the real
  // Appointment/Contact module wiring.
  appointments: ['appointment:search', 'appointment:manage', 'tenant:manage'],
  contacts: ['contact:search', 'contact:manage', 'tenant:manage', 'tenant:admin'],
  // Matches divisions.routes.tsx's DIVISION_VIEW_PERMISSIONS exactly. Moved
  // here 2026-07-31 from a standalone "Company Data" section/mechanism
  // (PERMISSION_NAV_SECTIONS, now removed) when Divisions was folded into
  // CRM — Division is a CRM-native concept (Lead/Project/Appointment all key
  // off it directly), not a separate top-level area.
  divisions: ['division:manage', 'tenant:manage'],
  // Matches projects.routes.tsx's PROJECTS_VIEW_PERMISSIONS exactly — found
  // 2026-08-04: this nav item had no gate at all, so a Sales Head account
  // (no project:* permission) could see and click into it and land on a
  // real 403 "Failed to load projects" screen.
  projects: ['project:search', 'project:manage', 'tenant:manage'],
  gantt: ['project:search', 'project:manage', 'tenant:manage'],
  // Matches camps.routes.tsx's CAMP_READ_PERMISSIONS exactly — same gap as
  // projects/gantt above, found + fixed 2026-08-04.
  camps: ['camp:search', 'camp:manage', 'tenant:manage'],
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Static map: navConfig icon string → Feather component
const ICON_MAP: Record<string, IconType> = {
  Grid:          FiGrid,
  TrendingUp:    FiTrendingUp,
  Navigation:    FiNavigation,
  Activity:      FiActivity,
  BarChart2:     FiBarChart2,
  Calendar:      FiCalendar,
  Users:         FiUsers,
  Briefcase:     FiBriefcase,
  FolderPlus:    FiFolderPlus,
  Sliders:       FiSliders,
  Clipboard:     FiClipboard,
  Sun:           FiSun,
  Video:         FiVideo,
  Heart:         FiHeart,
  DollarSign:    FiDollarSign,
  UserCheck:     FiUserCheck,
  Settings:      FiSettings,
  MapPin:        FiMapPin,
  AlertTriangle: FiAlertTriangle,
  Cpu:           FiCpu,
  Globe:         FiGlobe,
  User:          FiUser,
  Package:       FiPackage,
  Box:           FiBox,
  FileText:      FiFileText,
  Shield:        FiShield,
  Zap:           FiZap,
  MessageSquare: FiMessageSquare,
}

const SECTIONS_KEY = 'qms.sb.sections'

function readCollapsedSections(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SECTIONS_KEY) || '[]')) }
  catch { return new Set() }
}

function saveCollapsedSections(set: Set<string>) {
  try { localStorage.setItem(SECTIONS_KEY, JSON.stringify([...set])) } catch {}
}

const NavIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const Icon = ICON_MAP[name] ?? FiCircle
  return <Icon size={size} />
}

// Every real nav path, flattened once from the fixed FULL_NAV_SECTIONS tree —
// used to find the single BEST (most specific) match for the current
// location, rather than letting every ancestor path light up independently.
// Several real routes are literal path-prefixes of others (e.g. Admin is
// '/admin', but Users/Settings/Tenants/Permission Groups/Role Types/Roles/HQ
// Mapping/AI Reminders/Inventory/Assets/Order & KPI Engine are all
// '/admin/...') — visiting '/admin/tenants' used to highlight BOTH "Admin"
// and "Companies" in the sidebar simultaneously, since the old isActive check
// only asked "does this item's path prefix-match the URL," never "is there a
// MORE SPECIFIC item that also matches." Found via a live screenshot showing
// two simultaneous highlights, confirmed to recur throughout the whole
// sidebar wherever a section's own landing route (e.g. '/admin', '/pharma')
// is also the literal path-prefix of its own child items.
const ALL_NAV_PATHS: string[] = FULL_NAV_SECTIONS.flatMap((section) =>
  section.subs.flatMap((sub) => sub.items.map((item) => item.path)),
)

function findBestMatchingNavPath(pathname: string): string | null {
  let best: string | null = null
  for (const path of ALL_NAV_PATHS) {
    const matches = pathname === path || pathname.startsWith(path + '/')
    if (matches && (best === null || path.length > best.length)) {
      best = path
    }
  }
  return best
}

const NavItemRow = ({ item, collapsed }: { item: NavItem; collapsed: boolean }) => {
  const location = useLocation()
  const isActive = item.path === findBestMatchingNavPath(location.pathname)

  return (
    <NavLink
      to={item.path}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.75 rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? ''
          : 'hover:bg-(--qms-surface-hover)'
      )}
      style={
        isActive
          ? {
              color: 'var(--qms-text)',
              background: 'linear-gradient(135deg, rgba(36,81,240,.12), rgba(20,184,166,.08))',
              boxShadow: 'inset 0 0 0 1px var(--qms-border-strong)',
            }
          : { color: 'var(--qms-text-muted)' }
      }
    >
      {/* Active left accent bar */}
      {isActive && (
        <span
          className="absolute -left-2.5 top-1.5 bottom-1.5 w-0.75 rounded-full"
          style={{ background: 'linear-gradient(180deg, var(--qms-brand), var(--qms-teal))' }}
        />
      )}

      <span className="shrink-0 text-current">
        <NavIcon name={item.icon} />
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span
          className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg text-white text-xs font-semibold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg"
          style={{ background: 'var(--popover)', color: 'var(--qms-text)' }}
        >
          {item.label}
        </span>
      )}
    </NavLink>
  )
}

const SectionBlock = ({
  section,
  collapsed,
  collapsedSections,
  onToggleSection,
}: {
  section: NavSection
  collapsed: boolean
  collapsedSections: Set<string>
  onToggleSection: (s: string) => void
}) => {
  const isSectionCollapsed = collapsedSections.has(section.section)

  return (
    <div>
      {!collapsed && (
        <button
          type="button"
          onClick={() => onToggleSection(section.section)}
          className="w-full flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[10px] font-bold tracking-widest uppercase transition-colors"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          <span>{section.section}</span>
          <FiChevronDown
            size={12}
            className={cn('transition-transform duration-150', isSectionCollapsed && '-rotate-90')}
          />
        </button>
      )}

      {!isSectionCollapsed && (
        <div className="flex flex-col gap-0.5">
          {section.subs.map((sub, si) => (
            <div key={si}>
              {!collapsed && sub.title && (
                <div className="px-2.5 pt-2 pb-0.5 text-[9px] font-bold tracking-widest uppercase opacity-70" style={{ color: 'var(--qms-text-muted)' }}>
                  {sub.title}
                </div>
              )}
              {sub.items.map((item) => (
                <NavItemRow key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user } = useAuth()
  const { permissions, isSettled } = useSession()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(readCollapsedSections)

  const isRealSystemManage = isSettled && permissions.includes('system:manage')

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      saveCollapsedSections(next)
      return next
    })
  }

  useEffect(() => {
    setCollapsedSections(readCollapsedSections())
  }, [user?.role])

  const nav = user ? getNavForRole(user.role) : []

  // getNavForRole's 'ALL' sentinel renders FULL_NAV_SECTIONS wholesale. But
  // `user.role` is currently ALWAYS 'super_admin' for every logged-in
  // account — the backend's login response has no `role` field at all, so
  // useLogin/SessionBootstrap fall back to 'super_admin' unconditionally
  // (see their own TODO comments; there's no honest mapping from the
  // backend's real roleType.code vocabulary to this 18-value UserRole enum).
  // That means restricting the WHOLE 'ALL' tree to real permissions would
  // leave every other account with an empty sidebar (nothing else provides
  // their nav yet) — a much bigger regression than the bug being fixed.
  // Scoped fix, two layers:
  //  1. The whole "System" section (Tenants/Roles/Role Types/Permission
  //     Groups/Users/Admin/Settings) stays hidden unless the real session
  //     holds system:manage — most of its items (Users/Admin/Settings) have
  //     no real permission code to check individually, so the section-level
  //     gate is the only real signal available for those.
  //  2. Individual items ANYWHERE in the tree whose own route IS wrapped in
  //     RequirePermission (REAL_GATED_NAV_ITEMS) are hidden unless the real
  //     session passes that item's own check — catches items living outside
  //     "System" too (e.g. "CRM" under Sales & CRM), which the section-level
  //     filter alone would miss. Confirmed live: a tenant:admin-only account
  //     saw "CRM" in its sidebar but was correctly bounced to /unauthorized
  //     on click — a dead link, not an access-control gap (the route guard
  //     was already correct), but confusing and worth closing.
  // Raw permissions.includes, not hasAnyPermission/hasAnyPermission-derived
  // helpers — same rationale as PERMISSION_NAV_SECTIONS: CRM/access-management
  // items are meant to bypass for system:manage (matches their own route
  // guards, which use the default hasAnyPermission), so a plain `.some(...)`
  // over the raw array reproduces that bypass correctly without importing
  // the helper's own semantics wholesale. (isRealSystemManage itself is
  // computed once, earlier in this component, and reused here.)
  const isNavItemVisible = (item: NavItem): boolean => {
    const requiredCodes = REAL_GATED_NAV_ITEMS[item.id]
    if (!requiredCodes) return true // no real gate defined for this item — leave it alone
    if (!isSettled) return false
    return isRealSystemManage || requiredCodes.some((code) => permissions.includes(code))
  }

  const visibleFullNavSections = FULL_NAV_SECTIONS
    .filter((section) => section.section !== 'System' || isRealSystemManage)
    .map((section) => ({
      ...section,
      subs: section.subs
        .map((sub) => ({ ...sub, items: sub.items.filter(isNavItemVisible) }))
        .filter((sub) => sub.items.length > 0),
    }))
    .filter((section) => section.subs.length > 0)

  return (
    <aside
      className={cn(
        'flex flex-col h-dvh sticky top-0 border-r backdrop-blur-xl transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
      style={{
        background: 'var(--qms-surface)',
        borderColor: 'var(--qms-border)',
      }}
    >
      {/* Brand */}
      <div
        className={cn('flex items-center gap-2 px-3 py-3.5 border-b', collapsed && 'justify-center')}
        style={{ borderColor: 'var(--qms-border)' }}
      >
        <button
          onClick={collapsed ? onToggle : undefined}
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          aria-label={collapsed ? 'Expand sidebar' : undefined}
        >
          Q
        </button>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold tracking-tight leading-none" style={{ color: 'var(--qms-text)' }}>QMS</div>
            <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Healthcare Ops OS</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all shrink-0 hover:bg-(--qms-surface-hover)"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
            aria-label="Collapse sidebar"
          >
            <FiChevronsLeft size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 py-2">
        {nav === 'ALL' ? (
          visibleFullNavSections.map((section) => (
            <SectionBlock
              key={section.section}
              section={section}
              collapsed={collapsed}
              collapsedSections={collapsedSections}
              onToggleSection={toggleSection}
            />
          ))
        ) : (
          <div className="flex flex-col gap-0.5">
            {nav.filter(isNavItemVisible).map((item) => (
              <NavItemRow key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        )}
      </div>

      {/* AI Copilot card */}
      {!collapsed && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--qms-border)' }}>
          <div
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <FiZap size={14} className="text-violet-500" />
              <span className="text-xs font-bold" style={{ color: 'var(--qms-text)' }}>AI Copilot</span>
            </div>
            <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
              Ask anything across camps, leads, FOs and inventory.
            </p>
            <button
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-px hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiMessageSquare size={12} />
              Ask Copilot
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
