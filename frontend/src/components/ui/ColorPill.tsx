interface ColorPillProps<S extends string> {
  status: S
  colorMap: Record<S, string>
  labelMap: Record<S, string>
  onClick?: () => void
  fallbackColor?: string
  showDot?: boolean
  className?: string
}

// Shared hex-color, alpha-blended-background status pill — used where the
// entity has more statuses than the fixed success/warning/danger utility
// classes can distinguish.
function ColorPill<S extends string>({
  status,
  colorMap,
  labelMap,
  onClick,
  fallbackColor = '#94a3b8',
  showDot = true,
  className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
}: ColorPillProps<S>) {
  const color = colorMap[status] ?? fallbackColor

  return (
    <span
      onClick={onClick}
      className={className}
      style={{ background: `${color}22`, color, cursor: onClick ? 'pointer' : undefined }}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {labelMap[status] ?? status}
    </span>
  )
}

export default ColorPill
