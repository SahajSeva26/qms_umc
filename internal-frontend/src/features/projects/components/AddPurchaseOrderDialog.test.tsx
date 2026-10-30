import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectEntity } from '@/types/project.types'
import { useAddProjectPurchaseOrder } from '@/features/projects/hooks/useAddProjectPurchaseOrder'
import AddPurchaseOrderDialog from './AddPurchaseOrderDialog'

const mutateAsync = vi.fn()

vi.mock('@/features/projects/hooks/useAddProjectPurchaseOrder')
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@qms/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qms/ui')>()
  return {
    ...actual,
    DatePicker: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
      <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    ),
  }
})

describe('AddPurchaseOrderDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAddProjectPurchaseOrder).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useAddProjectPurchaseOrder>)
    mutateAsync.mockResolvedValue({})
  })

  it('submits the required fields and omits a blank optional expiry', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<AddPurchaseOrderDialog project={{ id: 'project-1' } as ProjectEntity} onClose={onClose} />)

    await user.type(screen.getByLabelText(/po number/i), 'PO/2026/0042')
    await user.type(screen.getByLabelText(/^po date$/i), '2026-10-29')
    await user.click(screen.getByRole('button', { name: /^add po$/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      projectId: 'project-1',
      purchaseOrder: { number: 'PO/2026/0042', date: '2026-10-29' },
    }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors without calling the API', async () => {
    const user = userEvent.setup()
    render(<AddPurchaseOrderDialog project={{ id: 'project-1' } as ProjectEntity} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^add po$/i }))

    expect(await screen.findByText('PO number is required.')).toBeInTheDocument()
    expect(screen.getByText('PO date is required.')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
