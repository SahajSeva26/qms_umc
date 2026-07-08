import axios from 'axios'
import ENV from '@/config/env'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'

const api = axios.create({
  baseURL: ENV.Api.BaseUrl,
  withCredentials: true, // cookies are httpOnly — sent automatically
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = AUTH_ROUTES.LOGIN
    }
    return Promise.reject(error)
  }
)

export default api
