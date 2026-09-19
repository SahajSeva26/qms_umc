import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DietCampsPage from './DietCampsPage'

vi.mock('@/features/camps/pages/TypeScopedCampsPage', () => ({
  default: (props: { type: string; title: string }) => (
    <div data-testid="type-scoped-camps-page" data-type={props.type} data-title={props.title} />
  ),
}))

describe('DietCampsPage', () => {
  it('renders TypeScopedCampsPage with type="diet" and the correct title', () => {
    render(<DietCampsPage />)

    const el = screen.getByTestId('type-scoped-camps-page')
    expect(el).toHaveAttribute('data-type', 'diet')
    expect(el).toHaveAttribute('data-title', 'Diet Camps')
  })
})
