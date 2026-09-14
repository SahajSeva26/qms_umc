// Matches backend/src/modules/user/user.mapper.ts's UserMapper.toReportResponse
// (GET /users/report) field-for-field.
export interface UserReportQuery {
  from?: string
  to?: string
  granularity?: 'day' | 'month'
}

export interface UserReport {
  summary: {
    totalUsers: number
    active: number
    inactive: number
    suspended: number
    deleted: number
  }
  demographics: {
    gender: { male: number; female: number; other: number; unspecified: number }
  }
  security: {
    lockedAccounts: number
  }
  trends: {
    registrations: {
      granularity: 'day' | 'month'
      from: string
      to: string
      // period is 'YYYY-MM-DD' (day granularity) or 'YYYY-MM' (month granularity).
      // Every period in [from, to] is present, including zero-count ones.
      data: { period: string; count: number }[]
    }
  }
}
