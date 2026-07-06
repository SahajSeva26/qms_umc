import axios from 'axios'
import ENV from '@/config/env'

const api = axios.create({
  baseURL: ENV.Api.BaseUrl,
  withCredentials: true, // cookies are httpOnly — sent automatically
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export default api
