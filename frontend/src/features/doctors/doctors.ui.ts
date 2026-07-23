export function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}
