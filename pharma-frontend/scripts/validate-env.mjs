// CI/prebuild guard — the actual defense is this, not the runtime checks in src/config/env.ts.
// Those only throw once a real browser loads the compiled bundle; by then CI has already
// published a build artifact with broken config baked in. This script runs BEFORE `vite build`
// even starts, so a misconfigured var fails the build/pipeline outright instead of failing
// silently for whoever's unlucky enough to load the page first.
//
// Must be invoked with an explicit --mode (see build.mjs, the single driver that calls this and
// `vite build` with the SAME mode) — NODE_ENV/CI alone are NOT reliable: `node
// scripts/validate-env.mjs` runs as its own plain Node process BEFORE `vite build` ever starts, so
// Vite never gets the chance to set NODE_ENV for it. --mode also lets this load the SAME effective
// environment Vite itself would build with (loadEnv, reads .env/.env.<mode>/.env.local, not just
// process.env), so a var supplied only via .env.production (not a raw shell env var) is honored
// too, matching how Vite itself resolves import.meta.env.
//
// No "skip for non-production mode" branch — EVERY `vite build --mode <x>` call produces a real,
// deployable compiled artifact, not just `--mode production`. `npm run dev` (plain `vite`, no
// build) never invokes this script at all, so there is no legitimate case left where this script
// runs and should skip.
//
// Production hosts both apps from ONE public origin, path-routed by a deployment proxy (internal
// owns '/', pharma owns '/pharma/*' — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5), so a
// production build must NEVER carry an absolute cross-origin override: VITE_INTERNAL_DEV_ORIGIN
// is a LOCAL-DEVELOPMENT-ONLY escape hatch (src/config/env.ts's internalHref/internalDevOrigin),
// and its presence in a production build means someone fat-fingered the public domain into
// frontend config instead of letting the proxy own routing — exactly the class of
// misconfiguration this validator exists to catch before it ships, inverted from the old
// cross-origin-deployment model this replaced (which required that var, not rejected it).

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

const FORBIDDEN_IN_PROD_VARS = ['VITE_INTERNAL_DEV_ORIGIN']

const errors = []
for (const name of FORBIDDEN_IN_PROD_VARS) {
  const value = env[name]?.trim()
  if (value) {
    errors.push(
      `${name}="${value}" is set — this is a local-development-only override and must not be ` +
      'present in a production build. Production reaches the shared login through the same ' +
      'public origin via the deployment proxy; remove this var from the production environment.',
    )
  }
}

if (errors.length > 0) {
  console.error(
    `✖ Env validation FAILED (--mode ${modeArg}):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
  )
  process.exit(1)
}

console.log('✓ Env validation passed: no dev-only origin overrides present.')
