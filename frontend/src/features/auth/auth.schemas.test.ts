import { describe, it, expect } from 'vitest'
import { AuthMeResponseSchema } from '@/features/auth/auth.schemas'

const VALID_SESSION_RESPONSE = {
  success: true,
  message: 'Current session fetched successfully',
  data: {
    user: {
      id: '6a7c8363a4741b587778840d',
      email: 'system@gmail.com',
      firstName: 'system',
      lastName: 'user',
      avatar: { url: 'https://example.com/a.webp', id: '' },
    },
    role: { id: '6a7c8363a4741b587778840f', code: 'system', name: 'System role' },
    roleType: { id: '6a7c8363a4741b5877788404', code: 'system', name: 'System' },
    tenant: { id: '6a7c8363a4741b58777883d3', code: 'qms', name: 'Qms', type: 'platform' },
    permissions: ['system:manage'],
  },
}

describe('AuthMeResponseSchema', () => {
  it('accepts a valid real session response', () => {
    const result = AuthMeResponseSchema.safeParse(VALID_SESSION_RESPONSE)
    expect(result.success).toBe(true)
  })

  it('accepts a response with EXTRA unknown fields — additive backend changes are never a mismatch', () => {
    const withExtra = {
      ...VALID_SESSION_RESPONSE,
      data: { ...VALID_SESSION_RESPONSE.data, newFieldNobodyKnowsAboutYet: 'value' },
      unrelatedTopLevelField: 42,
    }
    const result = AuthMeResponseSchema.safeParse(withExtra)
    expect(result.success).toBe(true)
  })

  it('accepts a session missing the optional avatar field', () => {
    const userWithoutAvatar = {
      id: VALID_SESSION_RESPONSE.data.user.id,
      email: VALID_SESSION_RESPONSE.data.user.email,
      firstName: VALID_SESSION_RESPONSE.data.user.firstName,
      lastName: VALID_SESSION_RESPONSE.data.user.lastName,
    }
    const withoutAvatar = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, user: userWithoutAvatar } }
    const result = AuthMeResponseSchema.safeParse(withoutAvatar)
    expect(result.success).toBe(true)
  })

  it('rejects a response missing role.code — the exact class of drift this pilot exists to catch', () => {
    const malformed = {
      ...VALID_SESSION_RESPONSE,
      data: { ...VALID_SESSION_RESPONSE.data, role: { id: VALID_SESSION_RESPONSE.data.role.id, name: VALID_SESSION_RESPONSE.data.role.name } },
    }
    const result = AuthMeResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects role/roleType/tenant being null, even though the backend mapper has a nullable branch', () => {
    const withNullRole = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, role: null } }
    expect(AuthMeResponseSchema.safeParse(withNullRole).success).toBe(false)

    const withNullTenant = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, tenant: null } }
    expect(AuthMeResponseSchema.safeParse(withNullTenant).success).toBe(false)

    const withNullRoleType = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, roleType: null } }
    expect(AuthMeResponseSchema.safeParse(withNullRoleType).success).toBe(false)
  })

  it('rejects permissions being anything other than a string array', () => {
    const malformed = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, permissions: 'system:manage' } }
    const result = AuthMeResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects a broken top-level envelope (missing data key entirely)', () => {
    const malformed = { success: true, message: 'ok' }
    const result = AuthMeResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects success: false even if data happens to be present — a "successful" response must actually say so', () => {
    const malformed = { ...VALID_SESSION_RESPONSE, success: false }
    const result = AuthMeResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects tenant.type outside platform/customer — EditContactModal.tsx branches on === "platform" directly', () => {
    const malformed = { ...VALID_SESSION_RESPONSE, data: { ...VALID_SESSION_RESPONSE.data, tenant: { ...VALID_SESSION_RESPONSE.data.tenant, type: 'enterprise' } } }
    const result = AuthMeResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })
})
