// Jira can push any of its own workflow status names via the webhook (e.g. "In
// Progress", "Done", "To Do") — no longer a closed app-defined enum. 'open' is
// still the default a freshly-created row starts at.
export type QaFeedbackStatus = string

export interface QaFeedbackReportedByUser {
  id: string
  firstName: string
  lastName?: string
  email: string
}

export interface QaFeedbackEntity {
  id: string
  pageRoute: string
  pageTitle: string
  pinXPercent: number
  pinYPercent: number
  comment: string
  issueKey: string
  reportedBy: QaFeedbackReportedByUser | string
  status: QaFeedbackStatus
  resolutionNote: string
  createdAt: string
  updatedAt: string
}

export interface CreateQaFeedbackPayload {
  pageRoute: string
  pageTitle?: string
  pinXPercent: number
  pinYPercent: number
  comment: string
}

export interface UpdateQaFeedbackPayload {
  status?: QaFeedbackStatus
  resolutionNote?: string
}

export interface SearchQaFeedbackQuery {
  status?: QaFeedbackStatus
  issueKey?: string
  pageRoute?: string
  reportedBy?: string
  page?: string
  limit?: string
}
