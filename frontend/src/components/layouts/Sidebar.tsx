import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import * as LucideIcons from 'lucide-react'
import type React from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  getNavForRole,
  FULL_NAV_SECTIONS,
  type NavItem,
  type NavSection,
} from './navConfig'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const SECTIONS_KEY = 'qms.sb.sections'

function readCollapsedSections(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SECTIONS_KEY) || '[]')) }
  catch { return new Set() }
}

function saveCollapsedSections(set: Set<string>) {
  try { localStorage.setItem(SECTIONS_KEY, JSON.stringify([...set])) } catch {}
}

const toPascalCase = (str: string) =>
  str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')

const NavIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const iconName = toPascalCase(name) as keyof typeof LucideIcons
  const Icon = (LucideIcons[iconName] as React.ElementType) ?? LucideIcons.Circle
  return <Icon size={size} strokeWidth={1.8} />
}

const NavItemRow = ({ item, collapsed }: { item: NavItem; collapsed: boolean }) => {
  const location = useLocation()
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')

  return (
    <NavLink
      to={item.path}
      data-label={item.label}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? 'text-gray-900 dark:text-white'
          : 'text-gray-500 dark:text-[#7b85b8] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] hover:text-gray-800 dark:hover:text-[#aab2dc]'
      )}
      style={
        isActive
          ? {
              background: 'linear-gradient(135deg, rgba(36,81,240,.12), rgba(20,184,166,.08))',
              boxShadow: 'inset 0 0 0 1px rgba(36,81,240,0.18)',
            }
          : undefined
      }
    >
      {/* Active left accent bar */}
      {isActive && (
        <span
          className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-full"
          style={{ background: 'linear-gradient(180deg,#2451f0,#14b8a6)' }}
        />
      )}

      <span className="shrink-0 text-current">
        <NavIcon name={item.icon} />
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.live && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.13)] text-emerald-600 dark:text-emerald-400">
              LIVE
            </span>
          )}
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-[rgba(15,23,42,0.95)] text-white text-xs font-semibold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
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
          className="w-full flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[10px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#7b85b8] hover:text-gray-600 dark:hover:text-[#aab2dc] transition-colors"
        >
          <span>{section.section}</span>
          <LucideIcons.ChevronDown
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
                <div className="px-2.5 pt-2 pb-0.5 text-[9px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#7b85b8] opacity-70">
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(readCollapsedSections)

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      saveCollapsedSections(next)
      return next
    })
  }

  // Keep sections state in sync if role changes
  useEffect(() => {
    setCollapsedSections(readCollapsedSections())
  }, [user?.role])

  const nav = user ? getNavForRole(user.role) : []

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-[rgba(148,168,255,0.1)] bg-white dark:bg-[#070b1c] transition-all duration-200 overflow-hidden',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-2 px-3 py-3.5 border-b border-gray-100 dark:border-[rgba(148,168,255,0.08)]', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg,#2451f0,#14b8a6)' }}>
          Q
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">QMS</div>
            <div className="text-[10px] text-gray-400 dark:text-[#7b85b8] leading-tight mt-0.5">Healthcare Ops OS</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[rgba(148,168,255,0.15)] flex items-center justify-center text-gray-400 dark:text-[#7b85b8] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] hover:text-gray-600 dark:hover:text-[#aab2dc] transition-all shrink-0"
            aria-label="Collapse sidebar"
          >
            <LucideIcons.PanelLeftClose size={14} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={onToggle}
            className="absolute top-3.5 right-1 w-7 h-7 rounded-lg border border-gray-200 dark:border-[rgba(148,168,255,0.15)] flex items-center justify-center text-gray-400 dark:text-[#7b85b8] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] transition-all"
            aria-label="Expand sidebar"
          >
            <LucideIcons.PanelLeftOpen size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-[rgba(148,168,255,0.15)]">
        {nav === 'ALL' ? (
          FULL_NAV_SECTIONS.map((section) => (
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
            {nav.map((item) => (
              <NavItemRow key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        )}
      </div>

      {/* AI Copilot card — hidden when collapsed */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100 dark:border-[rgba(148,168,255,0.08)]">
          <div className="rounded-xl border border-gray-200 dark:border-[rgba(148,168,255,0.12)] bg-gray-50 dark:bg-[rgba(22,29,62,0.6)] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <LucideIcons.Sparkles size={14} className="text-violet-500" />
              <span className="text-xs font-bold text-gray-800 dark:text-[#e8ebff]">AI Copilot</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-[#7b85b8] leading-relaxed mb-2.5">
              Ask anything across camps, leads, FOs and inventory.
            </p>
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-px hover:shadow-md"
              style={{ background: 'linear-gradient(135deg,#2451f0,#0ea5e9)' }}>
              <LucideIcons.MessageSquare size={12} />
              Ask Copilot
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
