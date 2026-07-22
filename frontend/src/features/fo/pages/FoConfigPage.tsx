import { useState } from 'react'
import { FiFolder, FiActivity, FiPackage, FiRotateCw, FiDownload, FiPlus, FiSettings, FiCpu } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { useFoConfig } from '@/features/fo/hooks/useFoConfig'
import type { FoTestDef } from '@/features/fo/foConfig.types'
import ProjectConfigsTab from '@/features/fo/components/foconfig/ProjectConfigsTab'
import TestMasterTab from '@/features/fo/components/foconfig/TestMasterTab'
import ConsumableMappingTab from '@/features/fo/components/foconfig/ConsumableMappingTab'
import AddTestModal from '@/features/fo/components/foconfig/AddTestModal'

type TabId = 'projects' | 'tests' | 'consumables'

const TABS: { id: TabId; label: string; icon: typeof FiFolder }[] = [
  { id: 'projects', label: 'Project configs', icon: FiFolder },
  { id: 'tests', label: 'Test master', icon: FiActivity },
  { id: 'consumables', label: 'Consumable mapping', icon: FiPackage },
]

const INFO_CHIPS = [
  { icon: FiSettings, label: 'Backend-configurable' },
  { icon: FiActivity, label: 'Dynamic test master' },
  { icon: FiCpu, label: 'Auto interpretation' },
  { icon: FiPackage, label: 'Consumable mapping' },
]

const FoConfigPage = () => {
  const { saveTest, seedDemo, exportConfigSnapshot } = useFoConfig()
  const [tab, setTab] = useState<TabId>('projects')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  const handleReseed = async () => {
    if (!window.confirm('Re-seed demo project configs and test master? Existing custom configs will be preserved.')) return
    await seedDemo(false)
    toast.success('Demo re-seeded')
  }

  const handleExport = async () => {
    const payload = await exportConfigSnapshot()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fo-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddTest = async (def: FoTestDef) => {
    await saveTest(def)
    setSelectedTestId(def.id)
    setTab('tests')
    setAddOpen(false)
    toast.success(`Test ${def.id} added`)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Field Network · FO Config Master</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>FO Project &amp; Test Config Master</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INFO_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
              >
                <chip.icon size={11} /> {chip.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReseed}
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiRotateCw size={13} /> Re-seed demo
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiDownload size={13} /> Export JSON
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> Add test
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'projects' && <ProjectConfigsTab />}
      {tab === 'tests' && <TestMasterTab selectedTestId={selectedTestId} onSelectTest={setSelectedTestId} />}
      {tab === 'consumables' && <ConsumableMappingTab />}

      <AddTestModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddTest} />
    </div>
  )
}

export default FoConfigPage
