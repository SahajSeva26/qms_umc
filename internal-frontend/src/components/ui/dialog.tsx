// Thin compatibility re-export — @qms/ui's Dialog is now the single real implementation (this
// file used to be a near-identical copy). Kept so the existing '@/components/ui/dialog' import
// sites across this app don't all need touching at once; new code should prefer importing
// directly from '@qms/ui'.
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
} from '@qms/ui'
