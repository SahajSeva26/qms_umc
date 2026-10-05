import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const QA_FEEDBACK_ROUTES = {
  QA_FEEDBACK_REVIEW: '/admin/qa-feedback',
}

// Frontend-only gate — the backend's GET/POST /qa-feedback are open to any authenticated user (the
// per-page FeedbackWidget popover needs to read tickets too), but this full admin dashboard (with
// Add Note / resolve actions) stays reviewer-only by choice. FeedbackWidget itself is mounted
// directly by AppLayout (not through this routes file), so this gate doesn't affect its own eagerness.
const QA_FEEDBACK_VIEW_PERMISSIONS = ['qa-feedback:manage']

export const qaFeedbackRoutes: RouteObject[] = [
  {
    path: QA_FEEDBACK_ROUTES.QA_FEEDBACK_REVIEW,
    lazy: lazyRoute(() => import('./pages/QaFeedbackReviewPage'), QA_FEEDBACK_VIEW_PERMISSIONS),
  },
]
