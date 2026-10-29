import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import InvoiceStageStepper from './InvoiceStageStepper'

describe('InvoiceStageStepper', () => {
  it('distributes exactly the four prototype milestones across the row', () => {
    render(<InvoiceStageStepper status="draft" />)

    expect(screen.getByLabelText('Generated stage')).toHaveTextContent('1')
    expect(screen.getByLabelText('Approved stage')).toHaveTextContent('2')
    expect(screen.getByLabelText('GRN stage')).toHaveTextContent('3')
    expect(screen.getByLabelText('Paid stage')).toHaveTextContent('4')
    expect(screen.getByLabelText('Generated stage')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('Invoice stage labels')).toHaveTextContent('GeneratedApprovedGRNPaid')
  })

  it('folds the backend-only issued state into the Approved milestone', () => {
    render(<InvoiceStageStepper status="issued" />)

    expect(screen.getByLabelText('Approved stage')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('GRN stage')).not.toHaveAttribute('aria-current')
  })

  it('keeps cancelled as a separate non-linear terminal marker', () => {
    render(<InvoiceStageStepper status="cancelled" />)

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByLabelText('Generated stage')).not.toBeInTheDocument()
  })
})

