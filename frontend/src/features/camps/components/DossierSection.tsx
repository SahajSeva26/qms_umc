import type { ReactNode } from 'react'

interface DossierSectionProps {
  title: string
  children: ReactNode
}

const DossierSection = ({ title, children }: DossierSectionProps) => (
  <div
    className="rounded-2xl border p-4 md:p-5 mb-3.5"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <h2 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--qms-text-muted)' }}>
      {title}
    </h2>
    {children}
  </div>
)

export default DossierSection
