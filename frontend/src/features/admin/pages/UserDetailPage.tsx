import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useUser } from '@/features/admin/hooks/useUser'
import { useUpdateUser } from '@/features/admin/hooks/useUpdateUser'
import { ADMIN_ROUTES } from '@/features/admin/admin.routes'
import UserAvatar from '@/components/ui/UserAvatar'
import RoleBadge from '@/features/admin/components/RoleBadge'
import StatusPill from '@/features/admin/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserSchema } from '@/features/admin/schemas/user.schemas'

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useUser(id)
  const user = data?.data ?? null

  const updateUser = useUpdateUser(id ?? '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
    }
  }, [user])

  const handleSave = () => {
    const result = updateUserSchema.safeParse({ firstName, lastName })
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
        onClick={() => navigate(ADMIN_ROUTES.ADMIN_USERS)}
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
              <div className="flex items-center gap-2">
                <RoleBadge role={user.role} />
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

              {updateUser.isError && (
                <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  Failed to save changes.
                </div>
              )}
              {updateUser.isSuccess && (
                <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success">
                  Saved.
                </div>
              )}

              {formError && (
                <div className="text-xs text-danger">
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
