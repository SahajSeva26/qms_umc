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
