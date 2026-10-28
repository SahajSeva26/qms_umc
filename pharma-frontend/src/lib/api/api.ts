import axios from 'axios'
import ENV from '@/config/env'

const LOGIN_PATH = '/auth/login'

const api = axios.create({
  baseURL: ENV.Api.BaseUrl + '/api/v1',
  withCredentials: true, // auto set cookies
})

// Silent access-token refresh: on a non-login 401, try POST /auth/refresh-token
// once (it reads the refresh-token cookie itself, no body needed) and, if that
// succeeds, retry the original request with the now-rotated access-token
// cookie. Only falls back to a hard redirect if the refresh call ITSELF fails
// (refresh token also expired/invalid) or if refresh already failed once this
// page-load — never loops indefinitely.
//
// Concurrent-401 handling: if several requests fail at once (e.g. multiple
// components fetching on mount right as the access token expires), only the
// FIRST one triggers the actual refresh call; every other failing request
// awaits that same in-flight promise instead of firing its own redundant
// refresh-token call.
let refreshPromise: Promise<void> | null = null

// The shared login lives at the internal app's origin per the Decided login
// flow (md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5) — a real cross-origin
// navigation, not an in-app route. Guards against a reload loop the same way
// internal-frontend's api.ts does: skip if we're already there.
function redirectToLogin() {
  const loginUrl = `${ENV.Hosts.InternalOrigin}${LOGIN_PATH}`
  if (window.location.href.startsWith(loginUrl)) return
  window.location.href = loginUrl
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    const isLoginRequest = config?.url?.includes('/auth/login')
    const isRefreshRequest = config?.url?.includes('/auth/refresh-token')

    if (error.response?.status !== 401 || isLoginRequest) {
      return Promise.reject(error)
    }

    // The refresh call itself 401'd — the refresh token is genuinely
    // expired/invalid. No more silent options; the user needs to log in
    // again.
    if (isRefreshRequest) {
      redirectToLogin()
      return Promise.reject(error)
    }

    // Never retry the same request twice — if this one already went through
    // a refresh-and-retry cycle and still 401'd, the session is truly gone.
    if (config?._retriedAfterRefresh) {
      redirectToLogin()
      return Promise.reject(error)
    }

    try {
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh-token').then(() => undefined)
      }
      await refreshPromise
    } catch (refreshError) {
      // Same distinction as internal-frontend's api.ts: only force a logout
      // if the refresh request itself came back with a genuine 401. A
      // 429/network/5xx failure here means "couldn't refresh right now," not
      // "session is dead" — let the original request fail without nuking a
      // valid session.
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        redirectToLogin()
      }
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }

    return api({ ...config, _retriedAfterRefresh: true })
  },
)

export default api
