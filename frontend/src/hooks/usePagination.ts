import { useState } from 'react'

export function usePagination(pageSize: number) {
  const [page, setPage] = useState(1)

  const totalPages = (totalCount: number) => Math.max(1, Math.ceil(totalCount / pageSize))
  const resetToFirstPage = () => setPage(1)

  return { page, setPage, pageSize, totalPages, resetToFirstPage }
}
