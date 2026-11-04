import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TaxInvoiceDocument from './TaxInvoiceDocument'
import type { InvoiceEntity } from '@/types/invoice.types'
import type { InvoiceLineItemEntity } from '@/types/invoiceLineItem.types'
import type { Tenant } from '@/types/accessManagement.types'

function invoiceFixture(overrides: Partial<InvoiceEntity> = {}): InvoiceEntity {
  return {
    id: 'inv-1', code: 'inv-000001',
    tenant: { _id: 't-1', code: 'wellnex', name: 'WellNex Life Sciences' },
    project: { _id: 'p-1', name: 'Screening Drive', code: 'proj-1', status: 'live' },
    issueDate: '2026-10-19', subtotal: 236800, tax: 42624, discount: 0, total: 279424,
    status: 'paid', syncToTally: false, grn: null, stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as InvoiceEntity
}

function tenantFixture(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't-1', code: 'wellnex', name: 'WellNex Life Sciences',
    address: { addressLine1: '12 MG Road', addressLine2: '', locality: 'Andheri', city: 'Mumbai', state: 'Maharashtra', pincode: '400058' },
    businessLifetime: null, gst: '27BUYERGST1234Z',
    ...overrides,
  }
}

function lineItemFixture(overrides: Partial<InvoiceLineItemEntity> = {}): InvoiceLineItemEntity {
  return {
    id: 'li-1', invoice: 'inv-1',
    camp: { _id: 'c-1', code: 'cmp-000016', date: '2026-10-19', status: 'closed' },
    amount: 236800, createdAt: '', updatedAt: '', ...overrides,
  } as InvoiceLineItemEntity
}

// Regression: every field on the sample QMS tax-invoice PDF must appear as a labeled slot — real
// backend data where a field exists, '—' where it doesn't. Never a fabricated value.
describe('TaxInvoiceDocument — matches the sample format, real-data-only', () => {
  it('renders the real invoice code, amounts, and amount-in-words', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText('inv-000001')).toBeInTheDocument()
    expect(screen.getByText(/Two Lakh Seventy Nine Thousand Four Hundred Twenty Four/)).toBeInTheDocument()
  })

  it('renders the buyer\'s real name, GST, and address from the tenant record', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText('WellNex Life Sciences')).toBeInTheDocument()
    expect(screen.getByText(/27BUYERGST1234Z/)).toBeInTheDocument()
    expect(screen.getByText(/12 MG Road/)).toBeInTheDocument()
  })

  it('renders each line item from the real camp code + date, not an invented description', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText(/cmp-000016/)).toBeInTheDocument()
  })

  it('shows "—" for the buyer\'s GST when the tenant has none, not a fabricated value', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture({ gst: null })} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText('GST No. : —')).toBeInTheDocument()
  })

  it('shows every sample-format label that has no backend field, blank rather than invented', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText('IRN : —')).toBeInTheDocument()
    expect(screen.getByText('Ack No. : —')).toBeInTheDocument()
    expect(screen.getByText('Ack Date : —')).toBeInTheDocument()
    expect(screen.getByText('State Code : —')).toBeInTheDocument()
    expect(screen.getByText('Contact : —')).toBeInTheDocument()
    expect(screen.getByText('Phone : —')).toBeInTheDocument()
    expect(screen.getByText('Fax No. : —')).toBeInTheDocument()
    expect(screen.getByText('Email ID : —')).toBeInTheDocument()
    expect(screen.getByText('Pan No. : —')).toBeInTheDocument()
    expect(screen.getByText('Challan No :')).toBeInTheDocument()
    expect(screen.getByText('Order No :')).toBeInTheDocument()
    expect(screen.getByText('Despatch Document No :')).toBeInTheDocument()
    expect(screen.getByText('Despatched through :')).toBeInTheDocument()
    expect(screen.getByText('Destination :')).toBeInTheDocument()
    expect(screen.getByText('Payment Terms :')).toBeInTheDocument()
    expect(screen.getByText('HSN/SAC Code')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
    expect(screen.getAllByText('Rate').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('per')).toBeInTheDocument()
  })

  it('shows the CGST/SGST split as a display-only halving of the one real invoice.tax figure', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture({ tax: 42624 })} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getAllByText((_, el) => el?.textContent === '₹21,312.00').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the static QMS letterhead info (company name, GST, bank details)', () => {
    render(<TaxInvoiceDocument invoice={invoiceFixture()} buyer={tenantFixture()} lineItems={[lineItemFixture()]} />)

    expect(screen.getByText('QMS MEDICAL ALLIED SERVICES LIMITED')).toBeInTheDocument()
    expect(screen.getByText(/CITI BANK - CC557876006/)).toBeInTheDocument()
  })
})
