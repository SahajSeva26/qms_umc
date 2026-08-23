import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'

type FieldError = { message?: string; type?: string }
type ResolverErrors = Record<string, FieldError | Record<string, FieldError>>

interface ReshapingResolverOptions<TFormValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
  // Builds the wire-shaped payload zodResolver actually validates against,
  // from this form's own flat field values.
  toPayload: (values: TFormValues) => unknown
  // Nested payload keys (e.g. 'user', 'owner') whose per-field errors need
  // remapping back to this form's own (differently-named) flat fields.
  nestedFieldMaps?: Record<string, Record<string, string>>
  // Top-level payload field renames (e.g. payload's `type` -> form's `roleType`).
  topLevelFieldMap?: Record<string, string>
}

// Shared factory for the "flat RHF form backs a differently-shaped Zod
// payload" resolver pattern used across Tenant/Role/RoleType create+edit
// forms: reshape this form's values into the real payload, validate with
// zodResolver, then map any errors back onto this form's own field names.
export function useReshapingResolver<TFormValues extends object>({
  schema,
  toPayload,
  nestedFieldMaps = {},
  topLevelFieldMap = {},
}: ReshapingResolverOptions<TFormValues>): Resolver<TFormValues> {
  const baseResolver = zodResolver(schema) as (payload: unknown, context: unknown, options: unknown) => Promise<{
    values: Record<string, unknown>
    errors: ResolverErrors
  }>

  return (async (values: TFormValues, context: unknown, options: unknown) => {
    const payload = toPayload(values)
    const result = await baseResolver(payload, context, options)

    const mappedErrors: Record<string, unknown> = {}
    for (const [path, err] of Object.entries(result.errors)) {
      const nestedMap = nestedFieldMaps[path]
      if (nestedMap && err && typeof err === 'object' && !('message' in err)) {
        for (const [nestedField, nestedErr] of Object.entries(err)) {
          mappedErrors[nestedMap[nestedField] ?? nestedField] = nestedErr
        }
        continue
      }
      mappedErrors[topLevelFieldMap[path] ?? path] = err
    }

    const hasErrors = Object.keys(mappedErrors).length > 0
    return { values: hasErrors ? {} : values, errors: mappedErrors } as never
  }) as Resolver<TFormValues>
}
