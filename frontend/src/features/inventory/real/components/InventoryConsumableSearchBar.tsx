import { useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'

type SearchMode = 'batch' | 'name'

export interface InventoryConsumableSearchBarValue {
  batch: string
  item: { id: string; label: string } | null
}

interface InventoryConsumableSearchBarProps {
  value: InventoryConsumableSearchBarValue
  onChange: (value: InventoryConsumableSearchBarValue) => void
}

// Batch matching is exact on the backend, so "Batch" mode submits on Enter/Find rather than filtering live.
const InventoryConsumableSearchBar = ({ value, onChange }: InventoryConsumableSearchBarProps) => {
  const [mode, setMode] = useState<SearchMode>('batch')
  const [batchDraft, setBatchDraft] = useState('')

  const switchMode = (next: SearchMode) => {
    setMode(next)
    setBatchDraft('')
    onChange({ batch: '', item: null })
  }

  const submitBatch = () => {
    if (!batchDraft.trim()) return
    onChange({ batch: batchDraft.trim(), item: null })
  }

  const clearBatch = () => {
    setBatchDraft('')
    onChange({ batch: '', item: null })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(v) => switchMode(v as SearchMode)}>
        <SelectTrigger className="w-32 text-[13px]" aria-label="Search by">
          <SelectValue>{() => (mode === 'batch' ? 'Batch' : 'Item name')}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="batch">Batch</SelectItem>
          <SelectItem value="name">Item name</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'batch' ? (
        value.batch ? (
          <div
            className="flex items-center gap-2 h-8 min-w-0 rounded-lg border px-2.5 text-[13px] cursor-pointer w-56"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            onClick={clearBatch}
          >
            <span className="flex-1 min-w-0 truncate font-mono">{value.batch}</span>
            <button type="button" onClick={clearBatch} aria-label="Clear batch filter">
              <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
              <Input
                placeholder="Search by batch..."
                value={batchDraft}
                onChange={(e) => setBatchDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitBatch() }}
                className="pl-8 text-[13px] w-48"
              />
            </div>
            <button
              type="button"
              disabled={!batchDraft.trim()}
              onClick={submitBatch}
              className="h-8 px-3 rounded-lg border text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-(--qms-surface-hover)"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              Find
            </button>
          </div>
        )
      ) : (
        <div className="w-56">
          <InventoryMasterItemPicker
            type="consumable"
            value={value.item?.id ?? ''}
            label={value.item?.label ?? ''}
            onChange={(id, label) => onChange({ batch: '', item: id ? { id, label } : null })}
          />
        </div>
      )}
    </div>
  )
}

export default InventoryConsumableSearchBar
