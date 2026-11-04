import { isPharmaRoleType } from '@/lib/access/pharmaAccess'
import { FULL_NAV_SECTIONS } from '@/lib/navigation/navRegistry'
import { getFirstVisibleNavPath, isNavItemDisabled, isNavItemVisible, type VisibleNavSession } from '@/lib/navigation/visibleNav'
import { PHARMA_ROLE_META } from '@/features/pharma/pharma.constants'
import { matchesInternalRouteFamily } from '@/features/auth/routePolicies'

// Pharma camp-dossier deep link — the one parameterized pharma path a session is allowed to
// return to directly (e.g. opened from a notification or a shared link before login). Mirrors
// pharma-frontend's own PHARMA_ROUTES.PHARMA_CAMP_DOSSIER ('/pharma/camps/:id') — kept as a
// literal regex here rather than importing pharma-frontend's source (cross-app imports are
// disallowed; see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §3 — "Do not import
// ../../internal-frontend/src/... from the new app," which cuts both directions).
const PHARMA_CAMP_DOSSIER_PATTERN = /^\/pharma\/camps\/[^/?#]+$/

/**
 * A syntactically well-formed, same-origin-relative path: starts with exactly one `/`, never `//`
 * (protocol-relative, e.g. `//evil.com`), never a backslash (some browsers treat `/\evil.com` as
 * protocol-relative too), and never an absolute URL (`http://...`, `javascript:...`, etc. all fail
 * the leading-single-slash check outright). This is a pure syntax check — it says nothing about
 * whether the PATH itself is one this session may actually use; see canUseReturnTo for that.
 */
function isWellFormedRelativePath(candidate: string): boolean {
  if (!candidate.startsWith('/')) return false
  if (candidate.startsWith('//')) return false
  if (candidate.includes('\\')) return false
  // A valid URL object constructed against a fixed, trusted base must resolve back to the exact
  // same relative path — catches malformed percent-encoding and other parser-level tricks without
  // hand-rolling URL parsing.
  try {
    const url = new URL(candidate, 'http://same-origin.invalid')
    return url.origin === 'http://same-origin.invalid' && `${url.pathname}${url.search}${url.hash}` === candidate
  } catch {
    return false
  }
}

// Internal paths are checked two ways: (1) an EXACT top-level nav-item match, against that item's
// own per-item visibility rule — not just "the session has SOME visible nav item," since a
// reachable sidebar entry doesn't mean every URL under it is reachable; or (2) a feature-owned
// route-family match (routePolicies.ts) for a real nested/parameterized deep link an exact
// nav-item match can never recognize (a camp drawer's '?camp=<id>', an edit page, a detail page —
// see routePolicies.ts's own header for why these need their own matchers, not a generic rule).
function isInternalPathReachable(session: VisibleNavSession, candidatePath: string): boolean {
  const items = FULL_NAV_SECTIONS.flatMap((section) => section.subs.flatMap((sub) => sub.items))
  const matched = items.find((item) => item.path === candidatePath)
  if (matched) return isNavItemVisible(matched, session) && !isNavItemDisabled(matched, session)
  return matchesInternalRouteFamily(session, candidatePath)
}

export interface ReturnToPolicySession extends VisibleNavSession {
  roleTypeCode: string | undefined
}

/**
 * Whether `candidatePath` is a legitimate destination for THIS authenticated session to be sent
 * back to after login — never trust a returnTo value until the session backing it is known. Only
 * UX routing protection (skips the generic landing page in favor of where the user was actually
 * headed); backend route/permission authorization remains the real security boundary regardless
 * of what this function decides.
 */
export function canUseReturnTo(session: ReturnToPolicySession, candidatePath: string): boolean {
  if (!isWellFormedRelativePath(candidatePath)) return false

  const isPharmaPath = candidatePath === '/pharma' || candidatePath.startsWith('/pharma/')

  if (isPharmaPath) {
    if (!isPharmaRoleType(session.roleTypeCode)) return false
    const ownPortalPath = PHARMA_ROLE_META[session.roleTypeCode].portalPath
    if (candidatePath === ownPortalPath) return true
    if (PHARMA_CAMP_DOSSIER_PATTERN.test(candidatePath)) return true
    // Deliberately narrow: an MR does not get a blanket "anything under /pharma/mr" or "anything
    // under /pharma" grant — only its own exact portal path and the one parameterized route this
    // session's role is actually permitted to deep-link into. A role-specific sub-path this
    // function doesn't yet recognize falls through to false, which is the safe default (falls
    // back to the role's normal landing page), not an error.
    return false
  }

  // A pharma session's non-pharma returnTo candidates are rejected outright — none of
  // internal-frontend's own routes are ones a pharma role should land back on.
  if (isPharmaRoleType(session.roleTypeCode)) return false

  // Internal path: reuse the SAME visibility rule the sidebar and the generic landing-path
  // resolver already apply — a returnTo this session couldn't navigate to via its own sidebar is
  // not a legitimate destination, regardless of how the path string looks.
  return getFirstVisibleNavPath(session) !== null && isInternalPathReachable(session, candidatePath)
}

/** True when a validated returnTo path belongs to the separately-deployed pharma build and must
 * be reached via a hard document navigation, not an in-app react-router `Navigate`. */
export function isPharmaBuildPath(path: string): boolean {
  return path === '/pharma' || path.startsWith('/pharma/')
}
