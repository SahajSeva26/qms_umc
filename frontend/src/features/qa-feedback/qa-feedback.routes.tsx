import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import QaFeedbackReviewPage from './pages/QaFeedbackReviewPage'

export const QA_FEEDBACK_ROUTES = {
  QA_FEEDBACK_REVIEW: '/admin/qa-feedback',
}

// Matches the backend's own AuthorizeMiddleware([QA_FEEDBACK_PERMISSIONS.MANAGE.code])
// on GET /qa-feedback (qaFeedback.routes.ts) — only reviewers see this page;
// POST /qa-feedback (submitting a report) has no permission gate of its own
// beyond being logged in, so every tester can use the FeedbackWidget trigger
// regardless of whether they can reach this review screen.
const QA_FEEDBACK_VIEW_PERMISSIONS = ['qa-feedback:manage']

export const qaFeedbackRoutes: RouteObject[] = [
  {
    path: QA_FEEDBACK_ROUTES.QA_FEEDBACK_REVIEW,
    element: (
      <RequirePermission anyOf={QA_FEEDBACK_VIEW_PERMISSIONS}>
        <QaFeedbackReviewPage />
      </RequirePermission>
    ),
  },
]
