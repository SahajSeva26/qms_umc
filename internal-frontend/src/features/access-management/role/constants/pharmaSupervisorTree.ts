// Mirrors the backend's ROLE_SUPERVISOR_TREE (role.constants.ts), pharma
// branch only — kept separate from roleTypeCodes.ts (already flagged stale
// there once) rather than growing that file's scope. Keyed by RoleType code;
// a role type absent from this map (or mapped to null) is a root — no
// supervisor required or offered. Division head is the root.
export const PHARMA_SUPERVISOR_PARENT_CODE: Record<string, string | null> = {
  'pharma-division-head': null,
  'pharma-rsm': 'pharma-division-head',
  'pharma-asm': 'pharma-rsm',
  'pharma-mr': 'pharma-asm',
}
