// Static lookup, never a template-literal class name — Tailwind's build
// scans source files as plain text for literal class names.
const CLASSES: Record<'available' | 'unavailable' | 'selected', string> = {
  available: 'bg-success-soft text-success border-success/30 hover:border-success',
  unavailable: 'bg-danger-soft text-danger border-danger/30 opacity-60 cursor-not-allowed',
  selected: 'bg-success text-white border-success',
}

interface AvailabilitySlotPillProps {
  label: string
  available: boolean
  selected: boolean
  onClick: () => void
}

// Available (green) pills are freely clickable; unavailable (red) pills
// render but stay disabled — shown, not hidden, so the user sees what's
// NOT bookable rather than guessing why a slot is missing (same "show but
// disable" pattern CampFoPicker.tsx uses for busy FOs).
const AvailabilitySlotPill = ({ label, available, selected, onClick }: AvailabilitySlotPillProps) => {
  const tone = selected ? 'selected' : available ? 'available' : 'unavailable'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      className={`w-full text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-colors ${CLASSES[tone]}`}
    >
      {label}
    </button>
  )
}

export default AvailabilitySlotPill
