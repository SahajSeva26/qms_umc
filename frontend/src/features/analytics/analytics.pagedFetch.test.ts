import { describe, it, expect, vi } from 'vitest'
import { fetchRemainingPagesBounded } from './analytics.pagedFetch'

describe('fetchRemainingPagesBounded', () => {
  it('fetches every remaining page exactly once, in order of page number in the result array', async () => {
    const fetchPage = vi.fn(async (page: number) => `page-${page}`)
    const results = await fetchRemainingPagesBounded(6, fetchPage) // pages 2..6 = 5 pages

    expect(results).toEqual(['page-2', 'page-3', 'page-4', 'page-5', 'page-6'])
    expect(fetchPage).toHaveBeenCalledTimes(5)
  })

  it('never has more than 4 concurrent in-flight calls', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchPage = vi.fn(async (page: number) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      return page
    })

    await fetchRemainingPagesBounded(21, fetchPage) // pages 2..21 = 20 pages, well over the concurrency cap

    expect(maxInFlight).toBeLessThanOrEqual(4)
    expect(fetchPage).toHaveBeenCalledTimes(20)
  })

  it('returns an empty array when there is only one page total', async () => {
    const fetchPage = vi.fn()
    const results = await fetchRemainingPagesBounded(1, fetchPage)

    expect(results).toEqual([])
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('propagates a rejection rather than silently returning a partial result', async () => {
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 3) throw new Error('page 3 failed')
      return page
    })

    await expect(fetchRemainingPagesBounded(5, fetchPage)).rejects.toThrow('page 3 failed')
  })
})
