// Guards against a real regression this app hit once: @qms/ui's barrel export (index.ts)
// re-exports GoogleMapsProvider/LocationPicker alongside everyday primitives (Button, Input,
// etc.). Without "sideEffects": false in @qms/ui's package.json, Rollup can't prove the
// @vis.gl/react-google-maps import inside that barrel is side-effect-free, so it hoists the
// ENTIRE Maps SDK into whichever chunk first imports anything from @qms/ui — usually the main
// bundle, since nearly every page imports Button/Input eagerly. That silently undoes the whole
// point of lazy-loading EditDoctorModal (the Maps SDK boundary) behind PharmaDoctorsTab.
//
// This script re-checks the actual built output: the main entry chunk (dist/assets/index-*.js)
// must never contain Maps-SDK markers, and must stay under a gzip size budget. Run via
// `npm run verify:bundle` after `npm run build`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')

// Markers unique enough to the @vis.gl/react-google-maps package's own source that they won't
// appear by coincidence elsewhere (confirmed against a real build before writing this).
const FORBIDDEN_MARKERS = ['APIProviderContext', '@vis.gl/react-google-maps']

// The notification bell is deliberately split: NotificationBellTrigger (icon+badge, eager, no
// @base-ui dependency) stays in the main bundle; NotificationBellPopover (the feed/mark-all-read/
// drawer, @base-ui/react/dialog+popover) must stay in its own lazy chunk, fetched only once the
// bell is actually clicked. These markers are unique to the popover's own query/mutation logic —
// confirmed against a real build before writing this — and must never appear in the main chunk.
const FORBIDDEN_NOTIFICATION_MARKERS = ['notifications-feed', 'markAllNotificationsRead']

// Baseline was ~176.9kB gzip before @base-ui/react/dialog + /popover were briefly eagerly
// imported into AppLayout/Topbar (which pushed it to ~214.1kB gzip — a real regression, since
// fixed by lazily mounting the mobile drawer and account popover behind first interaction).
// Budget gives headroom above the baseline without being so loose it can't catch a repeat.
const MAIN_BUNDLE_GZIP_BUDGET_BYTES = 190 * 1024

function findMainEntryChunk() {
  const files = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'))
  const entryChunk = files.find((f) => /^index-[^.]+\.js$/.test(f))
  if (!entryChunk) {
    throw new Error(`Could not find the main entry chunk (index-*.js) in ${DIST_ASSETS}. Run "npm run build" first.`)
  }
  return entryChunk
}

const entryChunk = findMainEntryChunk()
const entrySource = readFileSync(join(DIST_ASSETS, entryChunk), 'utf8')

const leaked = FORBIDDEN_MARKERS.filter((marker) => entrySource.includes(marker))
let failed = false

if (leaked.length > 0) {
  failed = true
  console.error(
    `✖ Bundle isolation check FAILED: the main entry chunk (${entryChunk}) contains the Maps SDK ` +
    `(markers found: ${leaked.join(', ')}).\n` +
    'This means @qms/ui\'s barrel export is pulling @vis.gl/react-google-maps into every page\'s ' +
    'initial bundle again, instead of keeping it isolated to EditDoctorModal\'s own lazy chunk.\n' +
    'Check @qms/ui/package.json still has "sideEffects": ["*.css"], and that no new eager import ' +
    'pulls LocationPicker/GoogleMapsProvider into a non-lazy module.',
  )
} else {
  console.log(`✓ Bundle isolation check passed: ${entryChunk} does not contain the Maps SDK.`)
}

const leakedNotification = FORBIDDEN_NOTIFICATION_MARKERS.filter((marker) => entrySource.includes(marker))

if (leakedNotification.length > 0) {
  failed = true
  console.error(
    `✖ Bundle isolation check FAILED: the main entry chunk (${entryChunk}) contains the ` +
    `notification popover/feed (markers found: ${leakedNotification.join(', ')}).\n` +
    'This means NotificationBellPopover was imported eagerly (or re-exported from @qms/ui\'s main ' +
    'barrel) instead of via its own lazy subpath ' +
    '(lazy(() => import(\'@qms/ui/notifications/NotificationBellPopover\'))). Only ' +
    'NotificationBellTrigger (the icon+badge) belongs in the eager shell.',
  )
} else {
  console.log(`✓ Bundle isolation check passed: ${entryChunk} does not contain the notification popover/feed.`)
}

const gzipBytes = gzipSync(entrySource).length
const gzipKB = (gzipBytes / 1024).toFixed(1)
const budgetKB = (MAIN_BUNDLE_GZIP_BUDGET_BYTES / 1024).toFixed(1)

if (gzipBytes > MAIN_BUNDLE_GZIP_BUDGET_BYTES) {
  failed = true
  console.error(
    `✖ Bundle size budget FAILED: the main entry chunk (${entryChunk}) is ${gzipKB}kB gzip, ` +
    `over the ${budgetKB}kB budget.\n` +
    'Something new is being eagerly imported into the always-loaded shell. Check for a new ' +
    'eager import in AppLayout/Topbar or another always-mounted component — heavy interaction ' +
    'UI (dialogs, popovers, editors) belongs behind React.lazy(), mounted only on first use.',
  )
} else {
  console.log(`✓ Bundle size budget passed: ${entryChunk} is ${gzipKB}kB gzip (budget ${budgetKB}kB).`)
}

if (failed) process.exit(1)
