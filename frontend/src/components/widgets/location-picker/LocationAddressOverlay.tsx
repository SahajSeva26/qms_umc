import { useId, useState } from 'react'
import { FiMapPin, FiX } from 'react-icons/fi'
import LocationAddressFields from './LocationAddressFields'
import { REQUIRED_ADDRESS_FIELDS } from './location.types'
import type { LocationValue } from '@/types/location.types'

interface LocationAddressOverlayProps {
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  defaultCountry?: string
  // Bounds the expanded card so it never exceeds MapCanvas's overflow-hidden bounds.
  mapHeight: number
  // Whether MapCanvas's loading/error banner is also in the shared bottom stack right now.
  reserveStatusBannerSpace?: boolean
  // Google's best-effort description of the point — shown when the address came back incomplete.
  locationHint?: string | null
}

function addressSummary(value: LocationValue | null): string | null {
  if (!value) return null
  const line1 = [value.addressLine1, value.locality].filter(Boolean).join(', ')
  const line2 = [value.city, value.state].filter(Boolean).join(', ')
  const summary = [line1, line2, value.pincode].filter(Boolean).join(' · ')
  return summary || null
}

// Height budget for one row in the shared bottom stack (pill or banner), same order as their padding/type scale.
const STACK_ROW_HEIGHT_PX = 40

const LocationAddressOverlay = ({ value, onChange, disabled, defaultCountry, mapHeight, reserveStatusBannerSpace, locationHint }: LocationAddressOverlayProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const missingRequired = value ? REQUIRED_ADDRESS_FIELDS.filter((f) => !value[f.key].trim()) : []
  const isIncomplete = missingRequired.length > 0
  const summary = addressSummary(value)

  // +1 row for the pill (always), +1 more when a status banner also shares the stack.
  const reservedRows = reserveStatusBannerSpace ? 2 : 1
  const maxHeightPx = mapHeight - STACK_ROW_HEIGHT_PX * reservedRows - 24

  return (
    <div className="flex flex-col items-end gap-1.5">
      {isOpen && (
        <div
          id={panelId}
          className="w-[min(22rem,calc(100%-1rem))] rounded-lg border bg-popover shadow-md ring-1 ring-foreground/10 p-3 overflow-y-auto"
          style={{ borderColor: 'var(--qms-border)', maxHeight: `${maxHeightPx}px` }}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Address</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Collapse address panel"
              className="shrink-0 rounded-md p-1 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text-soft)' }}
            >
              <FiX size={14} />
            </button>
          </div>
          <LocationAddressFields value={value} onChange={onChange} disabled={disabled} defaultCountry={defaultCountry} locationHint={locationHint} />
        </div>
      )}

      {/* Same neutral-surface wrapper the Roadmap/Satellite toggle uses. */}
      <div className="p-1 rounded-lg bg-popover shadow-md ring-1 ring-foreground/10">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold max-w-[16rem] border transition-colors"
          style={
            isIncomplete
              ? { background: 'var(--warning-soft)', color: 'var(--warning)', borderColor: 'var(--warning)' }
              : { background: summary ? 'var(--qms-brand)' : 'transparent', color: summary ? '#fff' : 'var(--qms-text-soft)', borderColor: 'transparent' }
          }
        >
          <FiMapPin size={12} className="shrink-0" />
          <span className="truncate">{summary ?? 'Add address'}</span>
        </button>
      </div>
    </div>
  )
}

export default LocationAddressOverlay
