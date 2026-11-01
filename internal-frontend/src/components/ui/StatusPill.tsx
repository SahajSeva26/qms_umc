interface StatusPillProps<S extends string> {
  status?: S
  classes: Record<S, string>
  labels: Record<S, string>
}

// Shared active/inactive-style status pill — a colored dot + label, or a
// neutral "—" placeholder when status is absent (e.g. hidden by a
// permission gate server-side).
function StatusPill<S extends string>({ status, classes, labels }: StatusPillProps<S>) {
  if (!status) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>
        —
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${classes[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  )
}

export default StatusPill
