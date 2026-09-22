import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePermission } from '@/hooks/usePermission'
import CampTableReal from './CampTableReal'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampRefNames', () => ({
  useCampRefNames: () => ({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    roleName: () => 'Ravi Kumar',
    projectName: () => 'Some Project',
  }),
}))

function mockSessionTenantType(type: 'platform' | 'customer') {
  vi.mocked(usePermission).mockReturnValue({
    session: { tenant: { type } },
  } as unknown as ReturnType<typeof usePermission>)
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

describe('CampTableReal', () => {
  it('renders Code, Schedule, Doctor, Location, FO, Status but no Company column for a tenant-scoped viewer', () => {
    mockSessionTenantType('customer')
    render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FO' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Company' })).not.toBeInTheDocument()
    // No independent Division or Slot columns — folded into Doctor/Schedule respectively.
    expect(screen.queryByRole('columnheader', { name: 'Division' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Slot' })).not.toBeInTheDocument()
  })

  it('shows the Company column for a platform-tenant viewer', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument()
    expect(screen.getByText('Migration Test Client')).toBeInTheDocument()
  })

  it('the Code cell is a real focusable, clickable control that opens the camp', async () => {
    mockSessionTenantType('platform')
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<CampTableReal camps={[campFixture()]} onOpen={onOpen} />)

    const codeButton = screen.getByRole('button', { name: 'cmp-000001' })
    codeButton.focus()
    expect(codeButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onOpen).toHaveBeenCalledWith('camp-1')
  })

  it('shows UNASSIGNED for a camp with no FO', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[campFixture({ fo: null })]} onOpen={vi.fn()} />)

    expect(screen.getByText('UNASSIGNED')).toBeInTheDocument()
  })

  it('shows the empty state when there are no camps', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[]} onOpen={vi.fn()} />)

    expect(screen.getByText('No camps found.')).toBeInTheDocument()
  })

  describe('expand/collapse detail panel', () => {
    it('does not render the detail panel before any toggle is clicked', () => {
      mockSessionTenantType('platform')
      render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

      expect(screen.queryByText('Patient target')).not.toBeInTheDocument()
      expect(screen.queryByText('Pincode')).not.toBeInTheDocument()
    })

    it('expands on toggle click and collapses on a second click', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

      const toggle = screen.getByRole('button', { name: 'Expand details for cmp-000001' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      await user.click(toggle)
      expect(screen.getByText('Pincode')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Collapse details for cmp-000001' })).toHaveAttribute('aria-expanded', 'true')

      await user.click(screen.getByRole('button', { name: 'Collapse details for cmp-000001' }))
      expect(screen.queryByText('Pincode')).not.toBeInTheDocument()
    })

    it('only expands one row at a time', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(
        <CampTableReal
          camps={[campFixture(), campFixture({ id: 'camp-2', code: 'cmp-000002' })]}
          onOpen={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))
      expect(screen.getByRole('button', { name: 'Collapse details for cmp-000001' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000002' }))
      expect(screen.getByRole('button', { name: 'Expand details for cmp-000001' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Collapse details for cmp-000002' })).toBeInTheDocument()
    })

    it('the toggle does not also open the drawer, and vice versa', async () => {
      mockSessionTenantType('platform')
      const onOpen = vi.fn()
      const user = userEvent.setup()
      render(<CampTableReal camps={[campFixture()]} onOpen={onOpen} />)

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))
      expect(onOpen).not.toHaveBeenCalled()
      expect(screen.getByText('Pincode')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'cmp-000001' }))
      expect(onOpen).toHaveBeenCalledWith('camp-1')
      // opening the drawer doesn't collapse the row
      expect(screen.getByText('Pincode')).toBeInTheDocument()
    })

    it('omits unavailable fields instead of rendering N/A', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(
        <CampTableReal
          camps={[campFixture({ location: null, fo: null, mr: null, doctor: { _id: 'doc-1', name: 'Dr. X' } })]}
          onOpen={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))

      const panel = screen.getByText('People & assignments').parentElement as HTMLElement
      expect(screen.getAllByText('Location unavailable').length).toBeGreaterThan(0)
      expect(screen.queryByText('Specialization')).not.toBeInTheDocument()
      expect(within(panel!).queryByText('MR')).not.toBeInTheDocument()
      expect(within(panel!).queryByText('FO')).not.toBeInTheDocument()
      expect(screen.queryByText('N/A')).not.toBeInTheDocument()
    })

    it('omits City/State cleanly when only one part of a partial address resolved', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(
        <CampTableReal
          camps={[
            campFixture({
              location: { addressLine1: '1 MG Road', city: 'Mumbai', state: '', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
            }),
          ]}
          onOpen={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))

      // "Mumbai" also appears in the collapsed row's own Location column
      // (same partial-address bug, same fix) — scope to the panel.
      const panel = screen.getByText('Camp Location').parentElement as HTMLElement
      expect(within(panel).getByText('Mumbai')).toBeInTheDocument()
      expect(screen.queryByText('Mumbai,')).not.toBeInTheDocument()
      expect(screen.queryByText(', Mumbai')).not.toBeInTheDocument()
    })

    it('renders a zero patient target instead of omitting it', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(<CampTableReal camps={[campFixture({ patientExpectation: 0 })]} onOpen={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))

      expect(screen.getByText('Patient target')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('shows the project name when the camp has a populated project', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(
        <CampTableReal
          camps={[campFixture({ project: { _id: 'proj-1', name: 'Some Project' } as unknown as CampEntity['project'] })]}
          onOpen={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))

      expect(screen.getByText('Some Project')).toBeInTheDocument()
    })

    it('still expands correctly for a platform-tenant viewer with the extra Company column', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Expand details for cmp-000001' }))

      expect(screen.getByText('Pincode')).toBeInTheDocument()
    })

    it('points aria-controls at the rendered panel id', async () => {
      mockSessionTenantType('platform')
      const user = userEvent.setup()
      render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

      const toggle = screen.getByRole('button', { name: 'Expand details for cmp-000001' })
      await user.click(toggle)

      const panelId = toggle.getAttribute('aria-controls')
      expect(panelId).toBeTruthy()
      expect(document.getElementById(panelId!)).toContainElement(screen.getByText('Pincode'))
    })
  })
})
