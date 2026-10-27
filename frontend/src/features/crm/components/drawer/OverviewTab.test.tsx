import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverviewTab from './OverviewTab'
import type { LeadEntity } from '@/types/crm.types'

function baseLead(overrides: Partial<LeadEntity> = {}): LeadEntity {
  return {
    id: 'mongo-object-id-abc123',
    code: 'ld-000042',
    tenant: { _id: 't-1', name: 'Sunrise Pharma Ltd', code: 'clt-000001' },
    division: { _id: 'd-1', name: 'Cardio-Diabetes', code: 'div-000001', therapy: [] },
    contactPerson: { _id: 'c-1', tenant: 't-1', name: 'Shalini Gupta', email: 'shalini@sunrise.example', type: 'customer', status: 'active' },
    salesPerson: { _id: 'r-1', code: 'staff-sales-rep-1', name: 'Rohit Malhotra', permissions: [], status: 'active', type: 'rt-1', user: 'u-1' },
    focusTherapy: ['Diabetes'],
    focusTherapyDoctor: ['Endocrinologist'],
    title: 'Adversarial sweep test lead',
    problemStatement: 'Testing sales-rep lead:create permission end-to-end.',
    numberOfMRS: 0,
    currentlyDoing: ['Screening camps'],
    projectType: 'screening',
    offers: [],
    estimatedValue: 500000,
    followUpDate: '2026-10-25T00:00:00.000Z',
    confidence: 50,
    status: 'new',
    stageHistory: [],
    createdAt: '2026-10-22T00:00:00.000Z',
    updatedAt: '2026-10-22T00:00:00.000Z',
    ...overrides,
  } as LeadEntity
}

describe('OverviewTab', () => {
  it('shows the human-readable lead code, not the raw Mongo id', () => {
    render(<OverviewTab lead={baseLead()} />)

    expect(screen.getByText('ld-000042')).toBeInTheDocument()
    expect(screen.queryByText('mongo-object-id-abc123')).not.toBeInTheDocument()
  })

  it('shows the contact person\'s email', () => {
    render(<OverviewTab lead={baseLead()} />)

    expect(screen.getByText('shalini@sunrise.example')).toBeInTheDocument()
  })

  it('falls back to "—" for Email when the contact has none', () => {
    render(<OverviewTab lead={baseLead({ contactPerson: { _id: 'c-2', tenant: 't-1', name: 'No Email Guy', type: 'customer', status: 'active' } })} />)

    expect(screen.getByText('Email').nextSibling).toHaveTextContent('—')
  })

  it('shows the contact person\'s phone', () => {
    render(<OverviewTab lead={baseLead({ contactPerson: { _id: 'c-1', tenant: 't-1', name: 'Shalini Gupta', email: 'shalini@sunrise.example', phone: '+91 9992665175', type: 'customer', status: 'active' } })} />)

    expect(screen.getByText('+91 9992665175')).toBeInTheDocument()
  })

  it('renders the main overview fields as a single 130px-label-column grid (matches the prototype\'s .kv layout), not a stacked label-above-value block', () => {
    render(<OverviewTab lead={baseLead()} />)

    const label = screen.getByText('Lead ID')
    const value = screen.getByText('ld-000042')
    // Grid container is 2 levels up from label/value (each in its own `.contents` row wrapper) —
    // its inline grid-template-columns is the real proof of side-by-side, not stacked, layout.
    const grid = label.parentElement?.parentElement
    expect(grid).toHaveStyle({ gridTemplateColumns: '130px 1fr' })
    expect(grid).toContainElement(value)
  })

  it('shows an Owner row in the main overview card (matches the prototype\'s .kv Owner row)', () => {
    render(<OverviewTab lead={baseLead()} />)

    const leadIdLabel = screen.getByText('Lead ID')
    const mainCard = leadIdLabel.parentElement?.parentElement
    expect(mainCard).toHaveTextContent('Owner')
    expect(mainCard).toHaveTextContent('Rohit Malhotra')
  })

  it('renders the Brief-aligned details panel with every field the prototype shows', () => {
    render(<OverviewTab lead={baseLead()} />)

    expect(screen.getByText('Brief-aligned details')).toBeInTheDocument()
    expect(screen.getByText('Pharma')).toBeInTheDocument()
    expect(screen.getByText('Est. value')).toBeInTheDocument()
    expect(screen.getByText('Next follow-up')).toBeInTheDocument()
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rohit Malhotra').length).toBeGreaterThan(0)
  })

  it('positions Brief-aligned details LAST — after Problem statement and Follow-up, matching the prototype\'s decorateDrawer (appendChild, runs after the original drawer body)', () => {
    render(<OverviewTab lead={baseLead()} />)

    const briefSection = screen.getByText('Brief-aligned details')
    const problemStatementHeading = screen.getByText('Problem statement', { selector: 'div' })
    const followUpHeading = screen.getByText('Follow-up')

    // DOCUMENT_POSITION_FOLLOWING (4) means briefSection comes AFTER the other node in the DOM.
    expect(briefSection.compareDocumentPosition(problemStatementHeading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(briefSection.compareDocumentPosition(followUpHeading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('shows Problem statement inline (label + text on one line, no separate card) inside the Brief-aligned details panel', () => {
    render(<OverviewTab lead={baseLead({ problemStatement: 'Unique brief-panel problem text' })} />)

    // Appears twice: once in the main "Problem statement" card, once inline in the brief panel.
    expect(screen.getAllByText('Unique brief-panel problem text').length).toBe(2)
    expect(screen.getByText('Problem statement:')).toBeInTheDocument()
  })

  it('shows a Lost callout with the most recent lost-transition reason when the lead is lost', () => {
    const lead = baseLead({
      status: 'lost',
      stageHistory: [
        { from: 'new', to: 'qualified', reason: 'Initial contact made', actor: {}, createdAt: '2026-10-01T00:00:00.000Z' },
        { from: 'qualified', to: 'lost', reason: 'Budget cut at year-end', actor: {}, createdAt: '2026-10-15T00:00:00.000Z' },
      ],
    })
    render(<OverviewTab lead={lead} />)

    // "Lost" appears 3x when the lead is lost: the stage badge (LEAD_STATUS_LABEL), the explicit
    // "Lost" badge, and the lost-reason block's own title.
    expect(screen.getAllByText('Lost').length).toBe(3)
    expect(screen.getByText('Budget cut at year-end')).toBeInTheDocument()
  })

  it('shows the LATEST lost reason when a lead was lost, reopened, and lost again', () => {
    const lead = baseLead({
      status: 'lost',
      stageHistory: [
        { from: 'qualified', to: 'lost', reason: 'First rejection reason', actor: {}, createdAt: '2026-09-01T00:00:00.000Z' },
        { from: 'lost', to: 'negotiation', reason: 'Reopened after follow-up', actor: {}, createdAt: '2026-09-15T00:00:00.000Z' },
        { from: 'negotiation', to: 'lost', reason: 'Second, final rejection reason', actor: {}, createdAt: '2026-10-01T00:00:00.000Z' },
      ],
    })
    render(<OverviewTab lead={lead} />)

    expect(screen.getByText('Second, final rejection reason')).toBeInTheDocument()
    expect(screen.queryByText('First rejection reason')).not.toBeInTheDocument()
  })

  it('does not show the Lost callout for a lead that is not currently lost, even if stageHistory has a lost entry from a past reopen', () => {
    const lead = baseLead({
      status: 'negotiation',
      stageHistory: [
        { from: 'qualified', to: 'lost', reason: 'Old rejection', actor: {}, createdAt: '2026-09-01T00:00:00.000Z' },
        { from: 'lost', to: 'negotiation', reason: 'Reopened', actor: {}, createdAt: '2026-09-15T00:00:00.000Z' },
      ],
    })
    render(<OverviewTab lead={lead} />)

    expect(screen.queryByText('Lost')).not.toBeInTheDocument()
    expect(screen.queryByText('Old rejection')).not.toBeInTheDocument()
  })
})
