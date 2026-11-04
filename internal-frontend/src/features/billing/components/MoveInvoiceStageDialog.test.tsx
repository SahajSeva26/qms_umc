import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import MoveInvoiceStageDialog from './MoveInvoiceStageDialog'
import { invoiceService } from '@/features/billing/invoice.service'
import type { InvoiceEntity } from '@/types/invoice.types'

vi.mock('@/features/billing/invoice.service', () => ({
  invoiceService: { moveInvoiceStage: vi.fn(async () => ({ success: true, message: '', data: {} })) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function invoiceFixture(overrides: Partial<InvoiceEntity> = {}): InvoiceEntity {
  return {
    id: 'inv-1', code: 'INV-000001',
    tenant: { _id: 't-1', code: 'wellnex', name: 'WellNex Life Sciences' },
    project: { _id: 'p-1', name: 'Screening Drive', code: 'proj-1', status: 'live' },
    issueDate: '2026-09-01', subtotal: 10000, tax: 0, discount: 0, total: 10000,
    status: 'issued', syncToTally: false, grn: null, stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as InvoiceEntity
}

function renderDialog(overrides: Partial<InvoiceEntity> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MoveInvoiceStageDialog invoice={invoiceFixture(overrides)} lineItemCount={1} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

// The real GRN number/document now live on the invoice detail panel (InvoiceGrnPanel +
// useUpdateInvoiceGrn), not this dialog — moveStage's payload is just {to, reason}.
describe('MoveInvoiceStageDialog', () => {
  it('shows a GRN hint, not input fields, when moving to grn_signed', async () => {
    // 'issued' -> legal targets are grn_signed/cancelled; default selection is grn_signed (first target).
    renderDialog({ status: 'issued' })
    expect(await screen.findByText(/record the grn number and upload the signed document/i)).toBeInTheDocument()
    expect(screen.queryByText('GRN number *')).not.toBeInTheDocument()
  })

  it('requires a reason before submit for any transition', async () => {
    renderDialog({ status: 'issued' })
    fireEvent.click(await screen.findByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('A reason is required to change status.')).toBeInTheDocument()
    expect(invoiceService.moveInvoiceStage).not.toHaveBeenCalled()
  })

  it('submits {to, reason} once a reason is given', async () => {
    renderDialog({ status: 'grn_signed' })
    fireEvent.change(await screen.findByPlaceholderText(/why is the status changing/i), { target: { value: 'Payment received' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await screen.findByText(/^save$/i)
    expect(invoiceService.moveInvoiceStage).toHaveBeenCalledWith('inv-1', { to: 'paid', reason: 'Payment received' })
  })
})
