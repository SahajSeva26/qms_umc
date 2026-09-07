interface ColorPillProps<S extends string> {
  status: S
  colorMap: Record<S, string>
  labelMap: Record<S, string>
  onClick?: () => void
  fallbackColor?: string
  /** Text color, if it must differ from the dot/tint source color (e.g. a
   * pale-tint background needs a fixed, always-legible ink rather than
   * reusing a light source color that would fail contrast as its own text).
   * Defaults to `colorMap[status]`, this component's original behavior. */
  textColor?: string
  showDot?: boolean
  className?: string
}

// Shared color-blended-background status pill — used where the entity has
// more statuses than the fixed success/warning/danger utility classes can
// distinguish. Background uses color-mix() (not string-concatenated hex
// alpha) so `color` may be a plain hex OR a CSS var() reference.
function ColorPill<S extends string>({
  status,
  colorMap,
  labelMap,
  onClick,
  fallbackColor = '#94a3b8',
  textColor,
  showDot = true,
  className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
}: ColorPillProps<S>) {
  const color = colorMap[status] ?? fallbackColor
  const resolvedTextColor = textColor ?? color

  return (
    <span
      onClick={onClick}
      className={className}
      style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color: resolvedTextColor, cursor: onClick ? 'pointer' : undefined }}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {labelMap[status] ?? status}
    </span>
  )
}

export default ColorPill
