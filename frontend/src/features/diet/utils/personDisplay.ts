// Person-display helpers shared across the Diet screens.
//
// initials() previously existed in four copies (approvals/helpers.ts,
// DietitianDetailDrawer, profile/profile.utils.ts, tabs/DietitiansTab) and
// stringToColor() in two. Three of the initials copies were identical; the
// DietitiansTab one lacked the null guard and would throw on an undefined
// name. This version keeps the safest behaviour of the set — the rendered
// output is unchanged for any real name.
//
// Deliberately Diet-local: the Doctors feature has its own copy, and one
// feature must not import another's internals. If a third feature ever needs
// this, promote it to the shared UI layer then — not before.

export function initials(name: string | undefined | null): string {
  return (name || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const PALETTE = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']

export function stringToColor(s: string | undefined | null): string {
  let h = 0
  const input = s || ''
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
