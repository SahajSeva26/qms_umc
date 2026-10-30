import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InventoryReportKpiStrip from './InventoryReportKpiStrip'
import { FiBox } from 'react-icons/fi'

describe('InventoryReportKpiStrip — canView=false renders nothing, not an empty "permission" box', () => {
  it('renders nothing when canView is false, even with real tiles passed in', () => {
    const { container } = render(
      <InventoryReportKpiStrip
        tiles={[{ key: 'total', label: 'Total', value: 8, tone: 'brand', icon: FiBox }]}
        isLoading={false}
        error={null}
        canView={false}
        skeletonCount={4}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/permission/i)).not.toBeInTheDocument()
  })

  it('renders the tiles normally when canView is true', () => {
    render(
      <InventoryReportKpiStrip
        tiles={[{ key: 'total', label: 'Total', value: 8, tone: 'brand', icon: FiBox }]}
        isLoading={false}
        error={null}
        canView={true}
        skeletonCount={4}
      />,
    )

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
