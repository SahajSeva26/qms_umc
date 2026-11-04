interface ColorPillProps<S extends string> {
  status: S
  colorMap: Record<S, string>
  labelMap: Record<S, string>
  onClick?: () => void
  fallbackColor?: string
  /** Defaults to the resolved status swatch (or fallback) — override when that color would fail contrast as its own text. */
  textColor?: string
  showDot?: boolean
  className?: string
  /** Solid fill instead of the default 13%-tinted background — matches the prototype's
   * solid-fill `.status-pill`. Defaults to false so other callers are unaffected. */
  solid?: boolean
}

// color-mix(), not string-concatenated hex alpha, since `color` may be a var() reference.
function ColorPill<S extends string>({
  status,
  colorMap,
  labelMap,
  onClick,
  fallbackColor = '#94a3b8',
  textColor,
  showDot = true,
  className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
  solid = false,
}: ColorPillProps<S>) {
  const color = colorMap[status] ?? fallbackColor
  const resolvedTextColor = textColor ?? color

  return (
    <span
      onClick={onClick}
      className={className}
      style={{
        background: solid ? color : `color-mix(in srgb, ${color} 13%, transparent)`,
        color: resolvedTextColor,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: solid ? resolvedTextColor : color, opacity: solid ? 0.85 : 1 }} />}
      {labelMap[status] ?? status}
    </span>
  )
}

export default ColorPill
