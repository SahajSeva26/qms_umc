import axios from 'axios'
import ENV from '@/config/env'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'

const api = axios.create({
  baseURL: ENV.Api.BaseUrl+"/api/v1",
  withCredentials: true,// auto set cookies
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

// Guards against a reload loop: if we're already on the login page, a "you
// need to log in again" 401 (e.g. GET /auth/me firing before any session
// exists yet) has nothing useful to redirect to — hard-reloading the same
// page just restarts the whole request cycle indefinitely.
function redirectToLogin() {
  if (window.location.pathname === AUTH_ROUTES.LOGIN) return
  window.location.href = AUTH_ROUTES.LOGIN
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

    // Already on the login page — there's no session to refresh (e.g. the
    // session query firing on first load before any login has happened).
    // Nothing to silently recover; just let the request fail.
    if (window.location.pathname === AUTH_ROUTES.LOGIN) {
      return Promise.reject(error)
    }

    // The refresh call itself 401'd — the refresh token is also expired/invalid.
    // No more silent options; the user genuinely needs to log in again.
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
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }

    return api({ ...config, _retriedAfterRefresh: true })
  }
)

export default api
