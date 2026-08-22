import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import type { ZodType } from 'zod'

type FieldError = { message?: string; type?: string }
type ResolverErrors = Record<string, FieldError | Record<string, FieldError>>

interface ReshapingResolverOptions<TFormValues, TPayload> {
  // Output typed to TPayload so a schema/payload mismatch is a type error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<TPayload, any>
  // Builds the wire-shaped payload zodResolver actually validates against,
  // from this form's own flat field values.
  toPayload: (values: TFormValues) => TPayload
  // Nested payload keys (e.g. 'user', 'owner') whose per-field errors need
  // remapping back to this form's own (differently-named) flat fields.
  nestedFieldMaps?: Record<string, Record<string, string>>
  // Top-level payload field renames (e.g. payload's `type` -> form's `roleType`).
  topLevelFieldMap?: Record<string, string>
}

// Shared "flat RHF form backs a differently-shaped Zod payload" resolver.
// `resolver` drives useForm as normal; `parsePayload` re-parses on submit
// and returns Zod's TRANSFORMED output (trim/lowercase/etc), so callers get
// the real normalized payload instead of rebuilding one from raw values.
export function useReshapingResolver<TFormValues extends object, TPayload = TFormValues>({
  schema,
  toPayload,
  nestedFieldMaps = {},
  topLevelFieldMap = {},
}: ReshapingResolverOptions<TFormValues, TPayload>): {
  resolver: Resolver<TFormValues>
  parsePayload: (values: TFormValues) => Promise<TPayload>
} {
  const baseResolver = zodResolver(schema) as (payload: unknown, context: unknown, options: unknown) => Promise<{
    values: TPayload
    errors: ResolverErrors
  }>

  const mapErrors = (errors: ResolverErrors) => {
    const mappedErrors: Record<string, unknown> = {}
    for (const [path, err] of Object.entries(errors)) {
      const nestedMap = nestedFieldMaps[path]
      if (nestedMap && err && typeof err === 'object' && !('message' in err)) {
        for (const [nestedField, nestedErr] of Object.entries(err)) {
          mappedErrors[nestedMap[nestedField] ?? nestedField] = nestedErr
        }
        continue
      }
      mappedErrors[topLevelFieldMap[path] ?? path] = err
    }
    return mappedErrors
  }

  const resolver: Resolver<TFormValues> = (async (values: TFormValues, context: unknown, options: unknown) => {
    const payload = toPayload(values)
    const result = await baseResolver(payload, context, options)
    const mappedErrors = mapErrors(result.errors)
    const hasErrors = Object.keys(mappedErrors).length > 0
    return { values: hasErrors ? {} : values, errors: mappedErrors } as never
  }) as Resolver<TFormValues>

  const parsePayload = async (values: TFormValues): Promise<TPayload> => {
    const payload = toPayload(values)
    const result = await baseResolver(payload, undefined, { shouldUseNativeValidation: false, fields: {} })
    const mappedErrors = mapErrors(result.errors)
    if (Object.keys(mappedErrors).length > 0) {
      throw new Error('parsePayload called with an invalid payload — this should never happen once handleSubmit has already validated the form.')
    }
    return result.values
  }

  return { resolver, parsePayload }
}
