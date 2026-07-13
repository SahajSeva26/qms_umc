import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import type { ClientMr, HierarchyNode } from '@/types/client.types'
import { buildHierarchy, HIERARCHY_TIER_COLORS } from '@/features/crm/clients/clients.utils'

interface HierarchyTreeProps {
  mrs: ClientMr[]
  onSelectMr: (mrId: string) => void
}

// Derived org tree: MR → ASM (manager string) → RM (region) → ZM root.
const HierarchyTree = ({ mrs, onSelectMr }: HierarchyTreeProps) => {
  const tree = useMemo(() => buildHierarchy(mrs), [mrs])

  // ZM + RM tiers start expanded so the shape of the org is visible at once
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = buildHierarchy(mrs)
    return new Set([initial.id, ...initial.children.map((c) => c.id)])
  })

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderNode = (node: HierarchyNode, depth: number): ReactNode => {
    const isLeaf = node.tier === 'MR'
    const isOpen = expanded.has(node.id)
    const color = HIERARCHY_TIER_COLORS[node.tier]
    return (
      <div key={node.id}>
        <button
          onClick={() => (isLeaf && node.mrId ? onSelectMr(node.mrId) : toggle(node.id))}
          className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-(--qms-surface-strong)"
          style={{ paddingLeft: depth * 18 + 8 }}
        >
          {isLeaf ? (
            <span className="w-[13px] shrink-0" />
          ) : isOpen ? (
            <FiChevronDown size={13} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
          ) : (
            <FiChevronRight size={13} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
          )}
          <span
            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: `${color}22`, color }}
          >
            {node.tier}
          </span>
          <span className="text-[12.5px] font-semibold flex-1 truncate" style={{ color: 'var(--qms-text)' }}>
            {node.label}
          </span>
          {!isLeaf && (
            <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: 'var(--qms-text-muted)' }}>
              {node.memberCount} MR{node.memberCount === 1 ? '' : 's'}
            </span>
          )}
        </button>
        {!isLeaf && isOpen && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <section className="mb-6">
      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Division Hierarchy
      </div>
      <div
        className="rounded-xl border p-2"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
      >
        {mrs.length === 0 ? (
          <p className="text-[12px] p-3" style={{ color: 'var(--qms-text-muted)' }}>
            No MRs mapped yet — add an MR to build the hierarchy.
          </p>
        ) : (
          renderNode(tree, 0)
        )}
      </div>
    </section>
  )
}

export default HierarchyTree
