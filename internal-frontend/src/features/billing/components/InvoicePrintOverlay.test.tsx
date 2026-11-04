import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InvoicePrintOverlay from './InvoicePrintOverlay'
import type { InvoiceEntity } from '@/types/invoice.types'

function invoiceFixture(): InvoiceEntity {
  return {
    id: 'inv-1', code: 'inv-000001',
    tenant: { _id: 't-1', code: 'wellnex', name: 'WellNex Life Sciences' },
    project: { _id: 'p-1', name: 'Screening Drive', code: 'proj-1', status: 'live' },
    issueDate: '2026-10-19', subtotal: 236800, tax: 42624, discount: 0, total: 279424,
    status: 'paid', syncToTally: false, grn: null, stageHistory: [],
    createdAt: '', updatedAt: '',
  } as InvoiceEntity
}

// Regression (P1): window.print() must never fire while the buyer/line-item requests are still
// loading or have failed — a slow/failed request previously still auto-printed an incomplete
// document ("Buyer: —", no camps) on a fixed timer regardless of request state.
describe('InvoicePrintOverlay — never prints an incomplete document', () => {
  let printSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    printSpy.mockRestore()
  })

  it('shows a loading state and never calls window.print() while still loading', () => {
    render(
      <InvoicePrintOverlay
        invoice={invoiceFixture()}
        buyer={null}
        lineItems={[]}
        isLoading
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Loading invoice for print…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^print$/i })).not.toBeInTheDocument()
    expect(printSpy).not.toHaveBeenCalled()
  })

  it('shows a retryable error state and never calls window.print() on failure', () => {
    const onRetry = vi.fn()
    render(
      <InvoicePrintOverlay
        invoice={invoiceFixture()}
        buyer={null}
        lineItems={[]}
        isLoading={false}
        error={new Error('network error')}
        onRetry={onRetry}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /^print$/i })).not.toBeInTheDocument()
    expect(printSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('only calls window.print() via an explicit click, once both requests have succeeded', () => {
    render(
      <InvoicePrintOverlay
        invoice={invoiceFixture()}
        buyer={null}
        lineItems={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(printSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^print$/i }))
    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
