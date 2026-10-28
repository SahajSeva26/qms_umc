// Guards against a real regression this app hit once: @qms/ui's barrel export (index.ts)
// re-exports GoogleMapsProvider/LocationPicker alongside everyday primitives (Button, Input,
// etc.). Without "sideEffects": false in @qms/ui's package.json, Rollup can't prove the
// @vis.gl/react-google-maps import inside that barrel is side-effect-free, so it hoists the
// ENTIRE Maps SDK into whichever chunk first imports anything from @qms/ui — usually the main
// bundle, since nearly every page imports Button/Input eagerly. That silently undoes the whole
// point of lazy-loading EditDoctorModal (the Maps SDK boundary) behind PharmaDoctorsTab.
//
// This script re-checks the actual built output: the main entry chunk (dist/assets/index-*.js)
// must never contain Maps-SDK markers. Run via `npm run verify:bundle` after `npm run build`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST_ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')

// Markers unique enough to the @vis.gl/react-google-maps package's own source that they won't
// appear by coincidence elsewhere (confirmed against a real build before writing this).
const FORBIDDEN_MARKERS = ['APIProviderContext', '@vis.gl/react-google-maps']

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

if (leaked.length > 0) {
  console.error(
    `✖ Bundle isolation check FAILED: the main entry chunk (${entryChunk}) contains the Maps SDK ` +
    `(markers found: ${leaked.join(', ')}).\n` +
    'This means @qms/ui\'s barrel export is pulling @vis.gl/react-google-maps into every page\'s ' +
    'initial bundle again, instead of keeping it isolated to EditDoctorModal\'s own lazy chunk.\n' +
    'Check @qms/ui/package.json still has "sideEffects": ["*.css"], and that no new eager import ' +
    'pulls LocationPicker/GoogleMapsProvider into a non-lazy module.',
  )
  process.exit(1)
}

console.log(`✓ Bundle isolation check passed: ${entryChunk} does not contain the Maps SDK.`)
