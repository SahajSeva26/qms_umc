import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePermission } from '@/hooks/usePermission'
import MyInventoryPanel from './MyInventoryPanel'

const FoInventoryContentMock = vi.fn()

vi.mock('@/hooks/usePermission')
vi.mock('@/features/inventory/real/components/FoInventoryContent', () => ({
  default: (props: { active: boolean; foRoleId: string }) => {
    FoInventoryContentMock(props)
    return <div>FoInventoryContent rendered</div>
  },
}))

function mockSession(roleId: string | undefined) {
  vi.mocked(usePermission).mockReturnValue({
    session: roleId ? { role: { id: roleId } } : null,
  } as unknown as ReturnType<typeof usePermission>)
}

describe('MyInventoryPanel', () => {
  beforeEach(() => vi.resetAllMocks())

  it('passes the signed-in session\'s own role id to FoInventoryContent, active, not a hard-coded or other-session id', () => {
    mockSession('role-abc-123')
    render(<MyInventoryPanel />)

    expect(FoInventoryContentMock).toHaveBeenCalledWith({ active: true, foRoleId: 'role-abc-123' })
    expect(screen.getByText('FoInventoryContent rendered')).toBeInTheDocument()
  })

  it('shows a recovery message instead of crashing or rendering FoInventoryContent when the session has no role id', () => {
    mockSession(undefined)
    render(<MyInventoryPanel />)

    expect(screen.getByText(/could not resolve your account/i)).toBeInTheDocument()
    expect(FoInventoryContentMock).not.toHaveBeenCalled()
  })
})
