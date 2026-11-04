import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import InvoiceStageStepper from './InvoiceStageStepper'

describe('InvoiceStageStepper', () => {
  it('distributes exactly the five real backend statuses across the row', () => {
    render(<InvoiceStageStepper status="draft" />)

    expect(screen.getByLabelText('Generated stage')).toHaveTextContent('1')
    expect(screen.getByLabelText('Approved stage')).toHaveTextContent('2')
    expect(screen.getByLabelText('Issued stage')).toHaveTextContent('3')
    expect(screen.getByLabelText('GRN stage')).toHaveTextContent('4')
    expect(screen.getByLabelText('Paid stage')).toHaveTextContent('5')
    expect(screen.getByLabelText('Generated stage')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('Invoice stage labels')).toHaveTextContent('GeneratedApprovedIssuedGRNPaid')
  })

  it('gives the backend issued state its own current milestone, distinct from Approved and GRN', () => {
    render(<InvoiceStageStepper status="issued" />)

    expect(screen.getByLabelText('Issued stage')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('Approved stage')).not.toHaveAttribute('aria-current')
    expect(screen.getByLabelText('GRN stage')).not.toHaveAttribute('aria-current')
  })

  it('keeps cancelled as a separate non-linear terminal marker', () => {
    render(<InvoiceStageStepper status="cancelled" />)

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByLabelText('Generated stage')).not.toBeInTheDocument()
  })
})

