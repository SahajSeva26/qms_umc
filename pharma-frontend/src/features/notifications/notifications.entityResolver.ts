import { FiBox } from 'react-icons/fi'
import { createNotificationEntityResolver } from '@qms/widgets'
import { campDossierPath } from '@/features/pharma/pharma.constants'

// pharma-frontend only — every session here is already a pharma role, so unlike
// internal-frontend's resolver there's no "non-field-force pharma role is excluded" gate to
// apply: that rule exists only because internal-frontend's notification feed is shared across
// pharma AND non-pharma sessions in one app. A lead/project notification resolves to null here
// not because of a role gate, but simply because this app has no lead/project screens to link to
// — only camp is a real, whitelisted entity type in pharma-frontend today.
export const resolveNotificationEntity = createNotificationEntityResolver({
  resolvers: {
    camp: {
      icon: FiBox,
      label: 'Camp',
      href: campDossierPath,
    },
  },
  requiredPermissions: {
    // Matches app/router.tsx's own PHARMA_VIEW_PERMISSIONS gate — every pharma session already
    // needs this to use the app at all, kept here for symmetry with internal-frontend's pattern
    // of gating camp links on the camp-view permission set.
    camp: (hasAnyPermission) => hasAnyPermission(['camp:book']),
  },
})
