import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePermission } from '@/hooks/usePermission'
import { useTest } from '@/features/test-master/hooks/useTest'
import { useTestResults } from '@/features/clinical/test-result/hooks/useTestResults'
import TestForm from '@/features/test-master/components/TestForm'

interface EditTestModalProps {
  // null = create mode
  testId: string | null
  onClose: () => void
}

// GET /test-masters/:id is the only endpoint carrying resource lines, so the
// full record must be fetched before TestForm can mount with real defaults.
const EditTestModal = ({ testId, onClose }: EditTestModalProps) => {
  const isEdit = !!testId
  const { data, isLoading, error, refetch } = useTest(testId ?? undefined)
  const test = data?.data

  // Cheap existence check (limit:'1') gated separately: an actor with only
  // test-master:manage (e.g. Ops Manager) has no test:search/manage at all.
  const { hasAnyPermission } = usePermission()
  const canViewResults = hasAnyPermission(['test:search', 'test:manage'])
  const { data: existingResults } = useTestResults({ type: testId ?? undefined, limit: '1' }, isEdit && canViewResults)
  const hasRecordedResults = (existingResults?.data?.count ?? 0) > 0

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
            {test && <TestForm key={testId} test={test} onClose={onClose} hasRecordedResults={hasRecordedResults} />}
          </QueryStateBlock>
        ) : (
          <TestForm test={null} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EditTestModal
