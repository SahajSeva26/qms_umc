import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const QA_FEEDBACK_ROUTES = {
  QA_FEEDBACK_REVIEW: '/admin/qa-feedback',
}

// Matches the backend's own AuthorizeMiddleware([QA_FEEDBACK_PERMISSIONS.MANAGE.code])
// on GET /qa-feedback (qaFeedback.routes.ts) — only reviewers see this page;
// POST /qa-feedback (submitting a report) has no permission gate of its own
// beyond being logged in, so every tester can use the FeedbackWidget trigger
// regardless of whether they can reach this review screen. FeedbackWidget
// itself is mounted directly by AppLayout (not through this routes file), so
// lazy-loading this review page doesn't affect the widget's own eagerness.
const QA_FEEDBACK_VIEW_PERMISSIONS = ['qa-feedback:manage']

export const qaFeedbackRoutes: RouteObject[] = [
  {
    path: QA_FEEDBACK_ROUTES.QA_FEEDBACK_REVIEW,
    lazy: lazyRoute(() => import('./pages/QaFeedbackReviewPage'), QA_FEEDBACK_VIEW_PERMISSIONS),
  },
]
