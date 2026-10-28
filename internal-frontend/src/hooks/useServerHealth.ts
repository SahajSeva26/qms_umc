import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ENV from '@/config/env'

// Not the shared `api` client — that's pinned to /api/v1, but /health-check lives outside it.
const healthClient = axios.create({ baseURL: ENV.Api.BaseUrl, timeout: 5000 })

const HEALTH_QUERY_KEY = ['server-health'] as const

// Manual-only — never fires on mount or in the background, only via checkHealth().
export const useServerHealth = () => {
  const query = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: () => healthClient.get('/health-check'),
    enabled: false,
    retry: false,
  })

  const checkHealth = () => query.refetch()

  return {
    checkHealth,
    isChecking: query.isFetching,
    // Only meaningful once a check has actually run — undefined beforehand.
    isAvailable: query.isFetched ? !query.isError : undefined,
  }
}
