// Regression test for validate-env.mjs — proves a NON-production mode is validated too, not just
// the literal string "production", and that the dev-only origin override is REJECTED in every
// build mode (production serves both apps from one public origin, path-routed by a deployment
// proxy — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5 — so a build carrying an absolute
// cross-origin override means someone misconfigured production, not a legitimate value). Run
// directly with `node scripts/validate-env.test.mjs` (plain node:test, no extra dependency — this
// is build tooling, not application code vitest covers).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The one forbidden-in-prod var this app's validator enforces — must match validate-env.mjs's
// FORBIDDEN_IN_PROD_VARS so this test's fixtures are actually exercising the right variable.
const DEV_ORIGIN_VAR = 'VITE_INTERNAL_DEV_ORIGIN'

// Deleted from the spawned child's env on EVERY call, regardless of whether a given fixture
// defines it in its own scratch .env — not just when a fixture omits it. loadEnv() gives real
// process.env precedence over a .env file, so a parent shell that happens to have this set would
// silently leak through here too, masking exactly the cases this test exists to prove.
function childEnv() {
  const env = { ...process.env }
  delete env[DEV_ORIGIN_VAR]
  return env
}

function runValidateEnv({ mode, envFileContent }) {
  // Isolated scratch dir so this never touches the real .env — loadEnv() reads from process.cwd().
  const scratchDir = mkdtempSync(join(tmpdir(), 'validate-env-test-'))
  writeFileSync(join(scratchDir, '.env'), envFileContent)
  // validate-env.mjs itself lives one level up from the scratch cwd we're running it from.
  const scriptPath = join(import.meta.dirname, 'validate-env.mjs')
  const args = mode ? [scriptPath, '--mode', mode] : [scriptPath]
  const result = spawnSync('node', args, {
    cwd: scratchDir,
    encoding: 'utf8',
    env: childEnv(),
  })
  rmSync(scratchDir, { recursive: true, force: true })
  return result
}

test('a staging build with NO dev-origin override passes validation', () => {
  const result = runValidateEnv({ mode: 'staging', envFileContent: 'VITE_API_URL=https://api.example.com\n' })
  assert.equal(result.status, 0, 'validate-env.mjs must pass when the dev-only override is absent')
})

test('a staging build WITH the dev-origin override fails validation (not just "production" — the regression this test exists to catch)', () => {
  const result = runValidateEnv({
    mode: 'staging',
    envFileContent: `${DEV_ORIGIN_VAR}=http://localhost:5173\n`,
  })
  assert.notEqual(result.status, 0, 'a dev-only override present in a staging build must fail, not silently pass')
  assert.match(result.stderr, /FAILED/, 'must print a clear failure, not silently skip')
})

test('a production build WITH the dev-origin override fails (the original case this check protects)', () => {
  const result = runValidateEnv({
    mode: 'production',
    envFileContent: `${DEV_ORIGIN_VAR}=http://localhost:5173\n`,
  })
  assert.notEqual(result.status, 0)
})

test('a production build with no dev-origin override passes', () => {
  const result = runValidateEnv({ mode: 'production', envFileContent: 'VITE_API_URL=https://api.example.com\n' })
  assert.equal(result.status, 0)
})

test('invoking with no --mode at all is a misconfiguration error, not a silent pass', () => {
  const result = runValidateEnv({ mode: null, envFileContent: 'VITE_API_URL=https://api.example.com\n' })
  assert.notEqual(result.status, 0)
})
