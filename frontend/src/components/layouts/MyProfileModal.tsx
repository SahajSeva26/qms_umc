import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { AuthUser } from '@/types/auth.types'
import type { SessionResponse } from '@/types/accessManagement.types'

interface MyProfileModalProps {
  user: AuthUser | null
  session: SessionResponse | null
  onClose: () => void
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

// Only fields genuinely present in the real session/auth data are shown —
// no mocked Phone/Department/Designation/HQ/Location/Reports To/Joined/About.
const MyProfileModal = ({ user, session, onClose }: MyProfileModalProps) => {
  const fullName = user ? `${user.firstName} ${user.lastName}` : '—'
  // The type marks these required, but the backend session mapper genuinely
  // emits null for an orphaned/malformed role or tenant reference.
  const roleLabel = session?.roleType?.name ?? '—'
  const tenantName = session?.tenant?.name ?? '—'

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: 'var(--qms-brand)' }}
            >
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div>
              <DialogTitle className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>My Profile</DialogTitle>
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{roleLabel}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Full Name</Label>
            <Input value={fullName} disabled />
          </div>
          <div>
            <Label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</Label>
            <Input value={user?.email ?? '—'} disabled />
          </div>
          <div>
            <Label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Role</Label>
            <Input value={roleLabel} disabled />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company</Label>
            <Input value={tenantName} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MyProfileModal
