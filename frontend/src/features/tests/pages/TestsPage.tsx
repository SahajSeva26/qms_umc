import TestMasterTab from '@/features/tests/components/TestMasterTab'

const TestsPage = () => {
  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          System · Test Master
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Test Master</h1>
      </div>

      <TestMasterTab />
    </div>
  )
}

export default TestsPage
