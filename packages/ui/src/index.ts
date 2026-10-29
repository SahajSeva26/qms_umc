export { cn } from './cn'
export { Button, buttonVariants } from './primitives/Button'
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './primitives/Dialog'
export { Input } from './primitives/Input'
export { Label } from './primitives/Label'
export { Select, SelectContent, SelectItem, SelectScrollDownButton, SelectScrollUpButton, SelectTrigger, SelectValue } from './primitives/Select'
export { Toaster, toast } from './primitives/Toaster'
export type { ToasterProps } from './primitives/Toaster'

export { default as GoogleMapsProvider } from './location/GoogleMapsProvider'
export { default as LocationPicker } from './location/LocationPicker'
export { default as LocationAddressFields } from './location/LocationAddressFields'
export type { LocationResolutionState, LocationPickerProps } from './location/location.types'
export { REQUIRED_ADDRESS_FIELDS } from './location/location.types'
// Public for standalone Places search widgets too (e.g. internal-frontend's StateCityFilter), not just LocationPicker's own internals.
export { usePlacesAutocomplete } from './location/usePlacesAutocomplete'
export type { Suggestion, SelectedPlaceDetails } from './location/usePlacesAutocomplete'

export { default as RootLayout } from './layout/RootLayout'
export { default as RouteErrorBoundary } from './layout/RouteErrorBoundary'
export { isChunkLoadError } from './layout/chunkLoadError'
export { default as RouteFallback } from './layout/RouteFallback'
export { default as SessionLoading } from './layout/SessionLoading'
export { default as SessionRecovery } from './layout/SessionRecovery'
export { default as UnauthorizedPage } from './layout/UnauthorizedPage'
export { default as NotFoundPage } from './layout/NotFoundPage'

// Notification UI (NotificationBellTrigger/Popover/Drawer/Card) deliberately does NOT live here —
// even the trigger performs a React Query API request (useUnreadNotificationCount), which violates
// this package's own independence rule (ui stays free of API services/session state/business
// features; see md-files/FRONTEND_SPLIT_ARCHITECTURE.md's dependency rule #2). It lives in
// @qms/widgets instead — a shared BUSINESS widget surface that's allowed to consume @qms/core's
// API/query hooks, which @qms/ui itself must not.
