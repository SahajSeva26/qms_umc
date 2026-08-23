import { createRoleSchema, updateRoleSchema } from '@/features/access-management/role/schemas/role.schemas'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import type { RoleStatus, CreateRolePayload, UpdateRolePayload } from '@/types/accessManagement.types'

// permissions comes from a separate picker, not the schema/resolver.
type CreateRoleSchemaPayload = Omit<CreateRolePayload, 'permissions'>
type UpdateRoleSchemaPayload = Omit<UpdateRolePayload, 'permissions'>

export interface CreateRoleFormValues {
  code: string
  name: string
  description: string
  tenant: string
  roleType: string
  division: string
  supervisor: string
  userFirstName: string
  userLastName: string
  userEmail: string
  userPassword: string
  userPhone: string
  userGender: '' | 'male' | 'female' | 'other'
}

export const EMPTY_CREATE_FORM_VALUES: CreateRoleFormValues = {
  code: '',
  name: '',
  description: '',
  tenant: '',
  roleType: '',
  division: '',
  supervisor: '',
  userFirstName: '',
  userLastName: '',
  userEmail: '',
  userPassword: '',
  userPhone: '',
  userGender: '',
}

export interface UpdateRoleFormValues {
  name: string
  description: string
  status: RoleStatus | ''
  roleType: string
  userFirstName: string
  userLastName: string
  userPhone: string
  userGender: '' | 'male' | 'female' | 'other'
  userStatus: '' | 'active' | 'inactive' | 'suspended' | 'deleted'
}

const CREATE_TOP_LEVEL_TO_FORM_FIELD: Record<string, keyof CreateRoleFormValues> = { type: 'roleType' }
const CREATE_USER_FIELD_TO_FORM_FIELD: Record<string, keyof CreateRoleFormValues> = {
  firstName: 'userFirstName',
  lastName: 'userLastName',
  email: 'userEmail',
  password: 'userPassword',
  phone: 'userPhone',
  gender: 'userGender',
}

const UPDATE_TOP_LEVEL_TO_FORM_FIELD: Record<string, keyof UpdateRoleFormValues> = { type: 'roleType' }
const UPDATE_USER_FIELD_TO_FORM_FIELD: Record<string, keyof UpdateRoleFormValues> = {
  firstName: 'userFirstName',
  lastName: 'userLastName',
  phone: 'userPhone',
  gender: 'userGender',
  status: 'userStatus',
}

export const useCreateRoleFormResolver = () =>
  useReshapingResolver<CreateRoleFormValues, CreateRoleSchemaPayload>({
    schema: createRoleSchema,
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      description: values.description,
      type: values.roleType,
      tenant: values.tenant,
      // Blank optional fields must be omitted, not sent as '' — the backend's
      // Zod schema rejects an empty string against a min(1)/enum check (only
      // gender was doing this correctly before; division/supervisor/phone
      // were passing '' straight through, which 400'd any non-pharma role
      // type with a blank phone number).
      division: values.division || undefined,
      supervisor: values.supervisor || undefined,
      user: {
        firstName: values.userFirstName,
        lastName: values.userLastName,
        email: values.userEmail,
        password: values.userPassword,
        // Unlike division/supervisor/gender above, phone is now required by
        // createRoleSchema (frontend-only policy — see role.schemas.ts), so
        // the Next-button gate never lets '' reach here. Passing it through
        // as-is (not `|| undefined`) means a blank value hits Zod's
        // .min(1, 'Phone number is required') message instead of being
        // masked into `undefined`, which would surface Zod's generic
        // "expected string, received undefined" type error instead.
        phone: values.userPhone,
        gender: values.userGender || undefined,
      },
    }),
    nestedFieldMaps: { user: CREATE_USER_FIELD_TO_FORM_FIELD },
    topLevelFieldMap: CREATE_TOP_LEVEL_TO_FORM_FIELD,
  })

export const useEditRoleFormResolver = () =>
  useReshapingResolver<UpdateRoleFormValues, UpdateRoleSchemaPayload>({
    schema: updateRoleSchema,
    toPayload: (values) => ({
      name: values.name,
      description: values.description,
      status: values.status || undefined,
      type: values.roleType,
      user: {
        firstName: values.userFirstName,
        lastName: values.userLastName,
        phone: values.userPhone,
        gender: values.userGender || undefined,
        status: values.userStatus || undefined,
      },
    }),
    nestedFieldMaps: { user: UPDATE_USER_FIELD_TO_FORM_FIELD },
    topLevelFieldMap: UPDATE_TOP_LEVEL_TO_FORM_FIELD,
  })

// Takes the already schema-parsed payload plus permissions (picker-sourced).
export function toCreateRolePayload(parsed: CreateRoleSchemaPayload, permissions: string[]): CreateRolePayload {
  return { ...parsed, permissions }
}

export function toUpdateRolePayload(parsed: UpdateRoleSchemaPayload, permissions: string[]): UpdateRolePayload {
  return { ...parsed, permissions }
}
