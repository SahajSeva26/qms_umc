import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import InvoiceCard from './InvoiceCard'
import type { InvoiceEntity } from '@/types/invoice.types'

vi.mock('@/features/billing/hooks/useAllInvoiceLineItems', () => ({
  useAllInvoiceLineItems: () => ({ data: undefined, isFetching: false, error: null, refetch: vi.fn() }),
}))

function invoiceFixture(overrides: Partial<InvoiceEntity> = {}): InvoiceEntity {
  return {
    id: 'inv-1', code: 'INV-000001',
    tenant: { _id: 't-1', code: 'wellnex', name: 'WellNex Life Sciences' },
    project: { _id: 'p-1', name: 'Screening Drive', code: 'proj-1', status: 'live' },
    issueDate: '2026-09-01', subtotal: 10000, tax: 0, discount: 0, total: 10000,
    status: 'issued', syncToTally: false, stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as InvoiceEntity
}

describe('InvoiceCard — Export CSV gated on invoice-line-item read permission', () => {
  it('shows Export CSV when canExport is true', () => {
    render(
      <InvoiceCard invoice={invoiceFixture()} onOpenDetail={vi.fn()} onChangeStatus={vi.fn()} canMoveStage={false} canExport canViewDetail />,
    )

    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('hides Export CSV when canExport is false — caller lacks invoice-line-item:search/:manage/tenant:manage', () => {
    render(
      <InvoiceCard invoice={invoiceFixture()} onOpenDetail={vi.fn()} onChangeStatus={vi.fn()} canMoveStage={false} canExport={false} canViewDetail />,
    )

    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument()
  })
})

describe('InvoiceCard — Detail gated on invoice get/manage permission', () => {
  it('shows Detail when canViewDetail is true', () => {
    render(
      <InvoiceCard invoice={invoiceFixture()} onOpenDetail={vi.fn()} onChangeStatus={vi.fn()} canMoveStage={false} canExport={false} canViewDetail />,
    )

    expect(screen.getByRole('button', { name: /detail/i })).toBeInTheDocument()
  })

  it('hides Detail when canViewDetail is false — caller lacks invoice:get/invoice:manage/tenant:manage', () => {
    render(
      <InvoiceCard invoice={invoiceFixture()} onOpenDetail={vi.fn()} onChangeStatus={vi.fn()} canMoveStage={false} canExport={false} canViewDetail={false} />,
    )

    expect(screen.queryByRole('button', { name: /detail/i })).not.toBeInTheDocument()
  })
})
