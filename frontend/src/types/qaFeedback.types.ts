export type QaFeedbackStatus = 'open' | 'resolved'

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
  pageRoute?: string
  reportedBy?: string
  page?: string
  limit?: string
}
