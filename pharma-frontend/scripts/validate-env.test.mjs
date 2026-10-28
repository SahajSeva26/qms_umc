// Regression test for validate-env.mjs — proves a NON-production mode is validated too, not just
// the literal string "production". An earlier version of this script skipped validation for any
// mode other than "production", so a real `vite build --mode staging` (or any other deployed mode)
// shipped with zero origin validation. Run directly with `node scripts/validate-env.test.mjs`
// (plain node:test, no extra dependency — this is build tooling, not application code vitest
// covers).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The one required origin var this app's validator enforces — must match validate-env.mjs's
// REQUIRED_ORIGIN_VARS so this test's fixtures are actually exercising the right variable.
const ORIGIN_VAR = 'VITE_INTERNAL_ORIGIN'

// Deleted from the spawned child's env on EVERY call, regardless of whether a given fixture
// defines it in its own scratch .env — not just when a fixture omits it. loadEnv() gives real
// process.env precedence over a .env file, so a CI pipeline that correctly exports
// VITE_INTERNAL_ORIGIN for its own real build would silently leak through here too, masking
// exactly the "missing"/"malformed" cases this test exists to prove fail. Confirmed live: with
// VITE_INTERNAL_ORIGIN set in the parent shell, 3 of 5 of these tests passed for the wrong
// reason (the inherited value, not the scratch .env fixture) before this fix.
function childEnv() {
  const env = { ...process.env }
  delete env[ORIGIN_VAR]
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

test('a staging build with a MISSING origin var fails validation (the regression this test exists to catch)', () => {
  const result = runValidateEnv({ mode: 'staging', envFileContent: 'VITE_API_URL=https://api.example.com\n' })
  assert.notEqual(result.status, 0, 'validate-env.mjs must exit non-zero for staging with no origin var set')
  assert.match(result.stderr, /FAILED/, 'must print a clear failure, not silently skip')
})

test('a staging build with a MALFORMED origin (no scheme) fails validation', () => {
  const result = runValidateEnv({
    mode: 'staging',
    envFileContent: `${ORIGIN_VAR}=internal.example.com\n`,
  })
  assert.notEqual(result.status, 0, 'a bare domain with no scheme must fail, not just a missing var')
})

test('a staging build with a VALID origin passes validation', () => {
  const result = runValidateEnv({
    mode: 'staging',
    envFileContent: `${ORIGIN_VAR}=https://internal-staging.example.com\n`,
  })
  assert.equal(result.status, 0, 'a well-formed absolute http(s) origin must pass in any mode, not just production')
})

test('a production build with a missing origin still fails (no regression on the original case)', () => {
  const result = runValidateEnv({ mode: 'production', envFileContent: 'VITE_API_URL=https://api.example.com\n' })
  assert.notEqual(result.status, 0)
})

test('invoking with no --mode at all is a misconfiguration error, not a silent pass', () => {
  const result = runValidateEnv({ mode: null, envFileContent: `${ORIGIN_VAR}=https://internal.example.com\n` })
  assert.notEqual(result.status, 0)
})
