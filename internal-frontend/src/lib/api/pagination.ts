// Fetches remaining pages CONCURRENCY at a time instead of all at once — same exact completeness
// as an unbounded Promise.all, just without bursting dozens of simultaneous requests.
const CONCURRENCY = 4

export async function fetchRemainingPagesBounded<T>(
  totalPages: number,
  fetchPage: (page: number) => Promise<T>,
): Promise<T[]> {
  const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
  const results: T[] = new Array(pageNumbers.length)

  let next = 0
  async function worker() {
    while (next < pageNumbers.length) {
      const i = next++
      results[i] = await fetchPage(pageNumbers[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pageNumbers.length) }, worker))
  return results
}
