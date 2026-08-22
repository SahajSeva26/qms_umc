export interface AuthUser {
  _id: string
  email: string
  firstName: string
  lastName: string
  avatar?: { url: string }
}

export interface LoginPayload {
  email: string
  password: string
}
