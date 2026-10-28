export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    count: number
    items: T[]
  }
}

export interface ApiError {
  message: string
  statusCode: number
  fields?: Record<string, string>
}
