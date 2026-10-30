// Matches the requested (not yet built — see md-files/BACKEND_REQUEST_book-camp-requirements.md)
// GET /projects/:id/requirements contract exactly. Feature-local, not promoted to a shared
// package — only one caller (the Book Camp tab's devices-required card) needs this shape.

export interface ProjectRequiredDevice {
  id: string
  code: string
  name: string
  rate?: number
}

export interface ProjectRequirementsResponse {
  devices: ProjectRequiredDevice[]
}
