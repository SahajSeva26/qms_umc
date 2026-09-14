import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePermission } from '@/hooks/usePermission'
import CampSummaryHeader from '@/features/camps/components/CampSummaryHeader'
import CampTableReal from '@/features/camps/components/CampTableReal'
import PharmaCampTable from '@/features/pharma/components/PharmaCampTable'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampRefNames', () => ({
  useCampRefNames: () => ({
    doctorName: () => 'Dr. Test',
    divisionName: () => 'Test Division',
    projectName: () => 'Test Project',
    roleName: () => 'Test Role',
  }),
}))

vi.mocked(usePermission).mockReturnValue({
  session: { tenant: { type: 'customer' } },
} as unknown as ReturnType<typeof usePermission>)

// A legacy camp predating the backend's location-nesting migration —
// camp.mapper.ts's `location: camp.location || null` makes this a reachable shape.
function legacyCampFixture(): CampEntity {
  return {
    id: 'camp-legacy', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, asm: null, rsm: null, date: '2026-09-15', timeSlot: '9am-1pm',
    location: null,
    devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '',
  }
}

describe('Location display — legacy camps with location: null', () => {
  it('CampSummaryHeader shows "Location unavailable" instead of "undefined, undefined"', () => {
    render(
      <CampSummaryHeader
        camp={legacyCampFixture()}
        isCreateMode={false}
        doctorName={() => 'Dr. Test'}
        divisionName={() => 'Test Division'}
        projectName={() => 'Test Project'}
      />,
    )
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
  })

  it('CampTableReal shows "Location unavailable" in the City / State column', () => {
    render(<CampTableReal camps={[legacyCampFixture()]} onOpen={vi.fn()} />)
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
  })

  it('PharmaCampTable shows "Location unavailable" in the Location column', () => {
    render(<PharmaCampTable camps={[legacyCampFixture()]} />)
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
  })
})

describe('Location display — a camp with a real location', () => {
  function campWithLocation(): CampEntity {
    return { ...legacyCampFixture(), location: { addressLine1: '1', city: 'Pune', state: 'Maharashtra', pincode: '411001', coordinates: [73.8, 18.5] } }
  }

  it('CampSummaryHeader shows "City, State"', () => {
    render(
      <CampSummaryHeader
        camp={campWithLocation()}
        isCreateMode={false}
        doctorName={() => 'Dr. Test'}
        divisionName={() => 'Test Division'}
        projectName={() => 'Test Project'}
      />,
    )
    expect(screen.getByText(/pune, maharashtra/i)).toBeInTheDocument()
  })

  it('CampTableReal shows "City, State"', () => {
    render(<CampTableReal camps={[campWithLocation()]} onOpen={vi.fn()} />)
    expect(screen.getByText(/pune, maharashtra/i)).toBeInTheDocument()
  })

  it('PharmaCampTable shows "City, State"', () => {
    render(<PharmaCampTable camps={[campWithLocation()]} />)
    expect(screen.getByText(/pune, maharashtra/i)).toBeInTheDocument()
  })
})
