import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FieldErrorText from './FieldErrorText'

describe('FieldErrorText', () => {
  it('renders a single message as one line', () => {
    render(<FieldErrorText message="City is required." />)
    expect(screen.getByText('City is required.')).toBeInTheDocument()
  })

  it('splits an accumulated multi-sentence message (useReshapingResolver output) into one line per sentence', () => {
    render(<FieldErrorText message="City is required. State is required. Pincode is required." />)
    expect(screen.getByText('City is required.')).toBeInTheDocument()
    expect(screen.getByText('State is required.')).toBeInTheDocument()
    expect(screen.getByText('Pincode is required.')).toBeInTheDocument()
  })

  it('renders each sentence in its own block-level span, not one run-on text node', () => {
    render(<FieldErrorText message="City is required. State is required." />)
    const city = screen.getByText('City is required.')
    const state = screen.getByText('State is required.')
    expect(city.tagName).toBe('SPAN')
    expect(state.tagName).toBe('SPAN')
    expect(city).not.toBe(state)
  })

  it('does not mis-split a message with no internal period-space boundary', () => {
    render(<FieldErrorText message="Enter a valid email" />)
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
  })

  // Documents a real limitation: useReshapingResolver joins sibling messages
  // with a plain space, not a period — a message missing its trailing period
  // stays fused to its neighbor instead of splitting onto its own line.
  it('fails to split two joined messages when the first one is missing its trailing period', () => {
    render(<FieldErrorText message="City is required State is required." />)
    expect(screen.getByText('City is required State is required.')).toBeInTheDocument()
  })
})
