import { z } from 'zod'

// Validation schema for the permission-group edit form. Follows the exact
// pattern of `@/features/pbac/tenant/schemas/tenant.schemas.ts` — a zod
// object run through safeParse, first issue message surfaced to the user.

export const updatePermissionGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z.string().trim().optional(),
  // Only takes effect server-side if caller has `system:manage` or `tenant:admin`.
  status: z.enum(['active', 'inactive']).optional(),
  // The "shopping cart" list: every permission (code/name/description) the
  // admin has ticked from the full PERMISSION_CATALOG, sent as full
  // IPermission objects per UpdatePermissionGroupPayload.
  permissions: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
})

export type UpdatePermissionGroupFormValues = z.infer<typeof updatePermissionGroupSchema>
