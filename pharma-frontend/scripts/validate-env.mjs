// CI/prebuild guard — the actual defense is this, not requiredInProd() in src/config/env.ts.
// That runtime check only throws once a real browser loads the compiled bundle; by then CI has
// already published a build artifact with a broken redirect baked in. This script runs BEFORE
// `vite build` even starts, so a missing required var fails the build/pipeline outright instead
// of failing silently for whoever's unlucky enough to load the page first.
//
// Must be invoked with an explicit --mode (see build.mjs, the single driver that calls this and
// `vite build` with the SAME mode) — NODE_ENV/CI alone are NOT reliable: `node
// scripts/validate-env.mjs` runs as its own plain Node process BEFORE `vite build` ever starts, so
// Vite never gets the chance to set NODE_ENV for it (confirmed: a real `npm run build` with no
// CI=true exported printed "skipped" here in an earlier version of this script — it was not
// actually enforcing anything in that case). --mode also lets this load the SAME effective
// environment Vite itself would build with (loadEnv, reads .env/.env.<mode>/.env.local, not just
// process.env), so a var supplied only via .env.production (not a raw shell env var) is honored
// too, matching how Vite itself resolves import.meta.env.
//
// No "skip for non-production mode" branch — EVERY `vite build --mode <x>` call produces a real,
// deployable compiled artifact, not just `--mode production`. An earlier version of this script
// skipped validation for any mode other than the literal string "production", so `vite build
// --mode staging` (or any other deployed mode) shipped with zero origin validation — reopening the
// exact gap this script exists to close, just renamed to a different mode string. `npm run dev`
// (plain `vite`, no build) never invokes this script at all, so there is no legitimate case left
// where this script runs and should skip.

import { loadEnv } from 'vite'

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1]
  ?? (process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : undefined)

if (!modeArg) {
  console.error(
    '✖ Env validation misconfigured: no --mode passed. The build driver (build.mjs) must call ' +
    'this with --mode <mode> — see package.json\'s "build" script.',
  )
  process.exit(1)
}

// Same env resolution Vite itself uses for this mode: .env, .env.production, .env.local,
// .env.production.local, then real process.env (CI-provided vars) — loadEnv already layers
// these in Vite's own precedence order. Empty prefix ('') loads every var, not just VITE_*.
const env = loadEnv(modeArg, process.cwd(), '')

const REQUIRED_ORIGIN_VARS = ['VITE_INTERNAL_ORIGIN']

// Not just non-empty — must be a real absolute http(s) origin. A value like "pharma.example.com"
// (no scheme) or a path/relative value would pass a bare non-empty check but produce a broken
// cross-origin redirect (window.location.href = "pharma.example.com/pharma/mr" resolves relative
// to the CURRENT page, not as a new host) — exactly the class of misconfiguration this validator
// exists to catch before it ships.
function isAbsoluteHttpOrigin(value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

const errors = []
for (const name of REQUIRED_ORIGIN_VARS) {
  const value = env[name]?.trim()
  if (!value) {
    errors.push(`${name} is missing`)
  } else if (!isAbsoluteHttpOrigin(value)) {
    errors.push(`${name}="${value}" is not an absolute http(s) origin (expected e.g. "https://app.example.com", no path/trailing slash)`)
  }
}

if (errors.length > 0) {
  console.error(
    `✖ Env validation FAILED (--mode ${modeArg}):\n${errors.map((e) => `  - ${e}`).join('\n')}\n` +
    'A build with these wrong/unset would publish a deployable artifact that redirects users to a ' +
    'dead or incorrect origin (src/config/env.ts\'s requiredInProd() only catches the missing case, ' +
    'only in an actual production mode, and only once a real browser loads the bundle — this check ' +
    'exists so CI refuses to publish that build at all, for every mode).',
  )
  process.exit(1)
}

console.log(`✓ Env validation passed: ${REQUIRED_ORIGIN_VARS.join(', ')} present and valid.`)
