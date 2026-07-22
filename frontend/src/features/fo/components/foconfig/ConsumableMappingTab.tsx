import { useEffect, useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { useFoConfig } from '@/features/fo/hooks/useFoConfig'
import * as foConfigService from '@/features/fo/foConfig.service'
import type { ConsumableMapEntry, FoTestDef } from '@/features/fo/foConfig.types'

const formatMap = (list: ConsumableMapEntry[]) => list.map((c) => `${c.consumableId}×${c.qtyPerTest}`).join(', ')

const parseMap = (raw: string): ConsumableMapEntry[] => {
  const tokens = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const parsed: ConsumableMapEntry[] = []
  for (const token of tokens) {
    const m = /^(.+?)[×x]\s*(\d+)$/i.exec(token)
    if (!m) continue
    parsed.push({ consumableId: m[1].trim(), qtyPerTest: Number(m[2]) })
  }
  return parsed
}

const ConsumableMappingTab = () => {
  const { tests, setConsumablesForTest } = useFoConfig()
  const [rows, setRows] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(tests.map(async (t) => [t.id, formatMap(await foConfigService.consumablesForTest(t.id))] as const)).then((entries) => {
      if (cancelled) return
      setRows((prev) => {
        const next = { ...prev }
        entries.forEach(([id, value]) => {
          if (!(id in next)) next[id] = value
        })
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests.map((t) => t.id).join(',')])

  const handleSave = async (test: FoTestDef) => {
    const raw = rows[test.id] ?? ''
    const list = parseMap(raw)
    await setConsumablesForTest(test.id, list)
    setRows((prev) => ({ ...prev, [test.id]: formatMap(list) }))
    toast.success(`Saved consumables for ${test.id}`)
  }

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Test → consumable mapping</h3>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>Consumables deduct automatically when this test is performed.</p>

      {tests.length === 0 && (
        <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>No tests defined yet.</div>
      )}

      {tests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                {['Test', 'Consumables', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-2 py-1.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2 py-1.5">
                    <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{t.id}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={rows[t.id] ?? ''}
                      onChange={(e) => setRows((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="STRIP×1, LANCET×1"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => handleSave(t)} style={{ color: 'var(--qms-brand)' }}><FiSave size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ConsumableMappingTab
