import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScreeningCampsPage from './ScreeningCampsPage'

vi.mock('@/features/camps/pages/TypeScopedCampsPage', () => ({
  default: (props: { type: string; title: string }) => (
    <div data-testid="type-scoped-camps-page" data-type={props.type} data-title={props.title} />
  ),
}))

describe('ScreeningCampsPage', () => {
  it('renders TypeScopedCampsPage with type="screening" and the correct title', () => {
    render(<ScreeningCampsPage />)

    const el = screen.getByTestId('type-scoped-camps-page')
    expect(el).toHaveAttribute('data-type', 'screening')
    expect(el).toHaveAttribute('data-title', 'Screening Camps')
  })
})
