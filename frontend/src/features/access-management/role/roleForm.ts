import { createRoleSchema, updateRoleSchema } from '@/features/access-management/role/schemas/role.schemas'
import { useReshapingResolver } from '@/features/access-management/hooks/useReshapingResolver'
import type { RoleStatus } from '@/features/access-management/accessManagement.types'

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
  useReshapingResolver<CreateRoleFormValues>({
    schema: createRoleSchema,
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      description: values.description,
      type: values.roleType,
      tenant: values.tenant,
      division: values.division,
      supervisor: values.supervisor,
      user: {
        firstName: values.userFirstName,
        lastName: values.userLastName,
        email: values.userEmail,
        password: values.userPassword,
        phone: values.userPhone,
        gender: values.userGender || undefined,
      },
    }),
    nestedFieldMaps: { user: CREATE_USER_FIELD_TO_FORM_FIELD },
    topLevelFieldMap: CREATE_TOP_LEVEL_TO_FORM_FIELD,
  })

export const useEditRoleFormResolver = () =>
  useReshapingResolver<UpdateRoleFormValues>({
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

export function toCreateRolePayload(values: CreateRoleFormValues, permissions: string[]) {
  return {
    code: values.code,
    name: values.name,
    description: values.description || undefined,
    type: values.roleType,
    tenant: values.tenant,
    division: values.division || undefined,
    supervisor: values.supervisor || undefined,
    permissions,
    user: {
      firstName: values.userFirstName,
      lastName: values.userLastName || undefined,
      email: values.userEmail,
      password: values.userPassword,
      phone: values.userPhone || undefined,
      gender: values.userGender || undefined,
    },
  }
}

export function toUpdateRolePayload(values: UpdateRoleFormValues, permissions: string[]) {
  return {
    name: values.name,
    description: values.description || undefined,
    status: values.status || undefined,
    type: values.roleType || undefined,
    permissions,
    user: {
      firstName: values.userFirstName || undefined,
      lastName: values.userLastName || undefined,
      status: values.userStatus || undefined,
      gender: values.userGender || undefined,
    },
  }
}
