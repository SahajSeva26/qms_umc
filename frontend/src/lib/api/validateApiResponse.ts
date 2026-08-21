import type { ZodType } from 'zod'
import { reportApiContractMismatch } from '@/lib/api/reportApiContractMismatch'

// Observe-only: never returns the parsed result, since that would silently strip fields the schema doesn't declare.
export function validateApiResponse<T>(schema: ZodType<T>, raw: unknown, endpoint: string): void {
  const result = schema.safeParse(raw)
  if (result.success) return

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    code: issue.code,
  }))
  reportApiContractMismatch(endpoint, issues)
}
