import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { useTest } from '@/features/tests/hooks/useTest'
import TestForm from '@/features/tests/components/TestForm'

interface EditTestModalProps {
  // null = create mode
  testId: string | null
  onClose: () => void
}

// A data-fetching wrapper, not the form itself — GET /test-masters/:id is the only
// endpoint that carries a test's resource lines at all, so an existing
// test's full record must be fetched before TestForm can mount with real
// defaultValues. useTest is always called (never conditionally), with
// `undefined` in create mode being what keeps it from firing.
const EditTestModal = ({ testId, onClose }: EditTestModalProps) => {
  const isEdit = !!testId
  const { data, isLoading, error, refetch } = useTest(testId ?? undefined)
  const test = data?.data

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {isEdit ? 'Edit test' : 'New test'}
          </DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <QueryStateBlock
            isLoading={isLoading}
            error={error}
            loadingLabel="Loading test…"
            errorLabel="Failed to load test. Please try again."
            onRetry={() => refetch()}
          >
            {test && <TestForm key={testId} test={test} onClose={onClose} />}
          </QueryStateBlock>
        ) : (
          <TestForm test={null} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EditTestModal
