// Single build driver — the ONE place that decides the build mode, so env validation and the
// actual `vite build` can never diverge on it. Before this script, `package.json`'s build command
// was `node scripts/validate-env.mjs --mode production && tsc -b && vite build` — two independently
// invoked CLI tools, each free to receive its own trailing args. `npm run build -- --mode staging`
// would append `--mode staging` only to the LAST command in that chain (`vite build`), so Vite
// would build in staging mode while validate-env.mjs had already checked PRODUCTION env — a real
// mismatch, not a hypothetical one, confirmed by testing that exact invocation.
//
// Fix: this script reads --mode once (defaulting to 'production', matching Vite's own default when
// no mode is given), passes that SAME value to both the validator and the actual vite build call.

import { spawnSync } from 'node:child_process'

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1]
  ?? (process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : undefined)
  ?? 'production'

// `mode` only ever comes from a fixed --mode=production|development|staging-style CLI flag (never
// user/network input), so there's no real injection surface here — but spawnSync(cmd, args, {shell:
// true}) still logs a Node deprecation warning for combining an args array with shell:true (each
// arg's escaping becomes the shell's responsibility, not Node's). shell:true itself IS required on
// Windows (plain spawnSync('npx', [...]) without it throws ENOENT — npx/node are resolved via a
// .cmd shim, not found directly) — the safe form is one fully-quoted command string instead of an
// args array, which sidesteps the warning without losing the cross-platform resolution.
function run(commandLine) {
  const result = spawnSync(commandLine, { stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(`node scripts/validate-env.mjs --mode "${modeArg}"`)
run('npx tsc -b')
run(`npx vite build --mode "${modeArg}"`)
