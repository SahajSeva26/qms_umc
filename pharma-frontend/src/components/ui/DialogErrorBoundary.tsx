// Thin compatibility re-export — the real implementation now lives in @qms/widgets, shared with
// internal-frontend's own rating-section usage, so there's one source instead of two near-
// identical copies. Kept here so existing call sites (and their lazy-import module paths) don't
// need to change; new code should prefer importing directly from '@qms/widgets/dialog/DialogErrorBoundary'.
export { default } from '@qms/widgets/dialog/DialogErrorBoundary'
