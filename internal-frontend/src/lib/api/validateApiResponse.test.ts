import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { validateApiResponse } from '@/lib/api/validateApiResponse'
import * as reportModule from '@/lib/api/reportApiContractMismatch'

// Locks the two guarantees this pilot exists for: a valid response never
// reports, and a mismatch reports exactly once with only endpoint+path+code
// — never the raw payload, so a token or PII field can't leak through here.
describe('validateApiResponse', () => {
  const schema = z.object({
    id: z.string(),
    role: z.object({ code: z.string() }),
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not report when the response matches the schema', () => {
    const spy = vi.spyOn(reportModule, 'reportApiContractMismatch')
    validateApiResponse(schema, { id: 'u1', role: { code: 'admin' } }, '/test-endpoint')
    expect(spy).not.toHaveBeenCalled()
  })

  it('reports exactly once when a required field is missing', () => {
    const spy = vi.spyOn(reportModule, 'reportApiContractMismatch')
    validateApiResponse(schema, { id: 'u1', role: {} }, '/test-endpoint')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('batches all issues from one malformed response into a single report call', () => {
    const spy = vi.spyOn(reportModule, 'reportApiContractMismatch')
    validateApiResponse(schema, { role: {} }, '/test-endpoint') // missing id AND role.code
    expect(spy).toHaveBeenCalledTimes(1)
    const [, issues] = spy.mock.calls[0]
    expect(issues.length).toBeGreaterThanOrEqual(2)
  })

  it('reports only endpoint, path, and code — never the raw payload or field values', () => {
    const spy = vi.spyOn(reportModule, 'reportApiContractMismatch')
    const sensitivePayload = { id: undefined, role: { code: undefined }, secretToken: 'sk-should-never-appear' }
    validateApiResponse(schema, sensitivePayload, '/test-endpoint')

    expect(spy).toHaveBeenCalledTimes(1)
    const [endpoint, issues] = spy.mock.calls[0]
    expect(endpoint).toBe('/test-endpoint')
    for (const issue of issues) {
      expect(Object.keys(issue).sort()).toEqual(['code', 'path'])
    }
    const serialized = JSON.stringify(spy.mock.calls[0])
    expect(serialized).not.toContain('sk-should-never-appear')
  })

  it('a valid response is never mutated or replaced — the function has no return value to accidentally use', () => {
    // This is really a type-level guarantee (validateApiResponse returns
    // void), but assert the runtime behavior matches: calling it has no
    // observable effect on a variable that already holds the real response.
    const original = { id: 'u1', role: { code: 'admin' } }
    const result = validateApiResponse(schema, original, '/test-endpoint')
    expect(result).toBeUndefined()
  })
})
