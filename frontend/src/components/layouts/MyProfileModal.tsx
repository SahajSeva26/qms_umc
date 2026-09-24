import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useEntityImageUpload } from '@/components/widgets/upload/EntityImageUpload'
import { ACCEPTED_AVATAR_MIME_TYPES, validateAvatarFile } from '@/components/widgets/upload/avatar.constants'
import { useProfilePicture, profilePictureKeys } from '@/hooks/useProfilePicture'
import { useReplaceProfilePicture } from '@/hooks/useReplaceProfilePicture'
import type { AuthUser } from '@/types/auth.types'
import type { SessionResponse } from '@/types/accessManagement.types'

interface MyProfileModalProps {
  user: AuthUser | null
  session: SessionResponse | null
  onClose: () => void
}

const PROFILE_PICTURE_COPY = {
  alt: 'Profile picture',
  uploadLabel: 'Upload picture',
  changeLabel: 'Change picture',
  noun: 'picture',
  currentNoun: 'the current picture',
  oldNoun: 'old picture',
  newNoun: 'new picture',
  previousNoun: 'previous picture',
  linkConflictMessage: 'Another picture was just activated for your profile.',
  // No frontend UI offers an admin-on-behalf fix for a profile picture — unlike tenant logo's
  // wording, this must not suggest a "manual fix" support path the user could actually reach.
  restoreFailedMessage: "We couldn't restore your previous picture. Please try uploading again.",
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

// Only fields genuinely present in the real session/auth data are shown —
// no mocked Phone/Department/Designation/HQ/Location/Reports To/Joined/About.
const MyProfileModal = ({ user, session, onClose }: MyProfileModalProps) => {
  const queryClient = useQueryClient()
  const fullName = user ? `${user.firstName} ${user.lastName}` : '—'
  // roleType/tenant are typed required, but the backend session mapper can emit null.
  const roleLabel = session?.roleType?.name ?? '—'
  const tenantName = session?.tenant?.name ?? '—'

  // Real ids must exist before any upload can be attempted or shown as manageable.
  const canManagePicture = !!user?.id && !!session?.tenant?.id

  // Called unconditionally with safe fallback ids (Rules of Hooks forbids gating behind
  // `if (!user) return null`) — the real gate is canManagePicture below, not whether these run.
  const picture = useProfilePicture(user?.id ?? '')
  const replacePicture = useReplaceProfilePicture(session?.tenant?.id ?? '', user?.id ?? '', picture.fileId, {
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: profilePictureKeys.detail(user.id) })
      }
    },
  })
  const { column: pictureColumn, feedback: pictureFeedback, hasLongFeedback, startOverDialog } = useEntityImageUpload({
    read: picture,
    replace: replacePicture,
    size: 'sm',
    canManage: canManagePicture,
    copy: PROFILE_PICTURE_COPY,
    accept: ACCEPTED_AVATAR_MIME_TYPES.join(','),
    validateFile: validateAvatarFile,
  })
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {canManagePicture ? (
              // LogoPreview's own fallback icon covers "no picture yet" — one avatar-shaped box, not two.
              pictureColumn
            ) : (
              // No real ids yet — the upload column can't render meaningfully; fall back to initials.
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: 'var(--qms-brand)' }}
              >
                {getInitials(user?.firstName, user?.lastName)}
              </div>
            )}
            <div>
              <DialogTitle className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>My Profile</DialogTitle>
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{roleLabel}</p>
            </div>
          </div>
        </DialogHeader>

        {hasLongFeedback && (
          <div className="flex flex-col gap-2 text-left">
            {pictureFeedback}
          </div>
        )}

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

      {startOverDialog}
    </Dialog>
  )
}

export default MyProfileModal
