import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useUser } from '@/features/admin/hooks/useUser'
import { useUpdateUser } from '@/features/admin/hooks/useUpdateUser'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import UserAvatar from '@/components/ui/UserAvatar'
import RealRoleBadge from '@/features/admin/components/RealRoleBadge'
import StatusPill from '@/features/admin/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { updateUserSchema } from '@/features/admin/schemas/user.schemas'
import { useScrollIntoViewOnChange } from '@/hooks/useScrollIntoViewOnChange'
import type { UserStatus } from '@/types/user.types'

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
]

// Literal path (not imported from admin.routes.tsx) — that file imports this
// component, so importing back from it here would be a circular module
// dependency (same pattern as CampDetailPage.tsx / CampDrawer.tsx).
const ADMIN_USERS_PATH = '/admin/users'

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useUser(id)
  const user = data?.data ?? null

  // Real bound-Role lookup by user id (this user's OWN Role, not the
  // hash-derived fake `user.role`/`RoleBadge` this page used before — see
  // admin.mock.ts's withMockFields: `role` is computed from a hash of the
  // user's _id and has zero relationship to their real backend RoleType).
  // A user may hold zero or more than one Role in principle; showing every
  // one found (usually exactly one) rather than assuming a single result.
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles(id ? { user: id, limit: '10' } : { limit: '0' })
  const roles = rolesData?.data?.items ?? []

  const updateUser = useUpdateUser(id ?? '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [formError, setFormError] = useState<string | null>(null)
  const errorRef = useScrollIntoViewOnChange<HTMLDivElement>(formError)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setStatus(user.status)
    }
  }, [user])

  const handleSave = () => {
    const result = updateUserSchema.safeParse({ firstName, lastName, status: status || undefined })
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }
    setFormError(null)
    updateUser.mutate(result.data)
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(ADMIN_USERS_PATH)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to users
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading user…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load user. Please try again.
        </div>
      )}

      {user && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5 flex items-center gap-4"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <UserAvatar firstName={user.firstName} lastName={user.lastName} tone={user.avatarTone} size="lg" />
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                {user.email}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RealRoleBadge
                  roleTypeName={roles[0] ? (typeof roles[0].type === 'string' ? roles[0].code : roles[0].type.name) : null}
                  isLoading={isLoadingRoles}
                />
                <StatusPill status={user.status} />
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              Edit profile
            </h2>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="firstName"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  First name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div>
                <Label
                  htmlFor="lastName"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Last name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div>
                <Label
                  htmlFor="status"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Status
                </Label>
                {/* Keyed on whether the user's real status has loaded yet —
                    forces exactly ONE remount, from "not yet loaded" to
                    "loaded", so this Select's first REAL render already has
                    the actual value. base-ui locks a Select into controlled/
                    uncontrolled mode based on whether `value` is `undefined`
                    on mount (React's classic controlled-component rule) and
                    won't honor a later change from undefined to a real
                    value — without this key, the useEffect-driven
                    `setStatus` below arrives one render too late and the
                    trigger is stuck showing the placeholder forever. Keying
                    on the status VALUE itself (rather than just "loaded or
                    not") would also remount on every user selection, causing
                    a visible flicker while they're actively using it — this
                    key only flips once. */}
                <Select key={status ? 'loaded' : 'loading'} value={status || undefined} onValueChange={(v) => setStatus(v as UserStatus)}>
                  <SelectTrigger id="status" className="w-full">
                    {/* Render-prop child, not a plain placeholder — base-ui's
                        SelectValue only auto-resolves a selected value's label
                        from an `items` prop passed to Select.Root, which this
                        app's Select wrapper never supplies, so a bare
                        placeholder shows correctly only until something is
                        selected, then falls back to the raw value. Same fix
                        applied to the CRM wizard's pickers earlier. */}
                    <SelectValue placeholder="Select status">
                      {(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? 'Select status'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {updateUser.isError && (
                <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  {(updateUser.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Failed to save changes.'}
                </div>
              )}
              {updateUser.isSuccess && (
                <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success">
                  Saved.
                </div>
              )}

              {formError && (
                <div ref={errorRef} className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  {formError}
                </div>
              )}

              <Button onClick={handleSave} disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default UserDetailPage
