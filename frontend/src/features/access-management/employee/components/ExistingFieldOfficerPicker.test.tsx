import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExistingFieldOfficerPicker from './ExistingFieldOfficerPicker'
import { useFieldOfficerRolePicker } from '@/features/access-management/employee/hooks/useFieldOfficerRolePicker'

vi.mock('@/features/access-management/employee/hooks/useFieldOfficerRolePicker')

function pickerReturn(overrides: Partial<ReturnType<typeof useFieldOfficerRolePicker>> = {}) {
  return {
    items: [],
    isFetching: false,
    isFetchingNextPage: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isDebouncing: false,
    hasSearchableQuery: true,
    ...overrides,
  } as ReturnType<typeof useFieldOfficerRolePicker>
}

function roleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role-1', code: 'fo-1', name: 'FO One', status: 'active',
    user: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210', gender: 'male', status: 'active', _id: 'user-1' },
    tenant: 't-1', permissions: [], type: 'rt-fo', createdAt: '', updatedAt: '',
    ...overrides,
  } as never
}

describe('ExistingFieldOfficerPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the "type at least 2 characters" prompt below the search threshold', () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ hasSearchableQuery: false }))
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={vi.fn()} />)

    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument()
  })

  it('selecting a row surfaces the populated user\'s id/email/phone', async () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ items: [roleFixture()] }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={onChange} />)

    await user.click(screen.getByText('Ravi Kumar'))

    expect(onChange).toHaveBeenCalledWith({ userId: 'user-1', email: 'ravi@example.com', phone: '9876543210', gender: 'male', label: 'Ravi Kumar' })
  })

  it('highlights the row matching the linked user\'s id (not the role\'s own id) via aria-pressed', () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ items: [roleFixture()] }))
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value="user-1" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /ravi kumar/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not highlight any row when value is the role\'s own id (the original bug\'s input) — proves the comparison targets the user id specifically', () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ items: [roleFixture()] }))
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value="role-1" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /ravi kumar/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('blocks a selected user with no phone, with a clear inline message, and does not call onChange', async () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({
      items: [roleFixture({ user: { firstName: 'NoPhone', email: 'np@example.com', status: 'active', _id: 'user-2' } })],
    }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={onChange} />)

    await user.click(screen.getByText('NoPhone'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/no phone number on file/i)).toBeInTheDocument()
  })

  it.each(['inactive', 'suspended', 'deleted'])('blocks a selected user whose status is %s, and does not call onChange', async (status) => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({
      items: [roleFixture({ user: { firstName: 'Bad', email: 'bad@example.com', phone: '111', status, _id: 'user-3' } })],
    }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={onChange} />)

    await user.click(screen.getByText('Bad'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(new RegExp(`this account is ${status}`, 'i'))).toBeInTheDocument()
  })

  it('blocks a row whose linked User was hard-deleted (a dangling populate reference resolves to user: null) with a distinct message, and does not crash or call onChange', async () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({
      items: [roleFixture({ id: 'role-dangling', code: 'fo-dangling', user: null })],
    }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={onChange} />)

    // roleLabel AND the email-fallback both read role.code when there's no populated user —
    // the row's button is the more targeted, unambiguous query.
    await user.click(screen.getByRole('button', { name: /fo-dangling/i }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/linked user no longer exists/i)).toBeInTheDocument()
  })

  it('blocks a row whose user is still a raw (unpopulated) string id, with a distinct "could not be loaded" message — told apart from the dangling-reference case above', async () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({
      items: [roleFixture({ id: 'role-unpopulated', code: 'fo-unpopulated', user: 'raw-user-id' })],
    }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /fo-unpopulated/i }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/details could not be loaded/i)).toBeInTheDocument()
  })

  it('shows a clear inline error on a search failure, not a silent empty list', () => {
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ error: new Error('403') }))
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={vi.fn()} />)

    expect(screen.getByText(/couldn't search field officers/i)).toBeInTheDocument()
  })

  it('"Load more" calls fetchNextPage without losing the currently-shown rows', async () => {
    const fetchNextPage = vi.fn()
    vi.mocked(useFieldOfficerRolePicker).mockReturnValue(pickerReturn({ items: [roleFixture()], hasNextPage: true, fetchNextPage }))
    const user = userEvent.setup()
    render(<ExistingFieldOfficerPicker tenant="t-1" foTypeId="rt-fo" value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /load more/i }))

    expect(fetchNextPage).toHaveBeenCalled()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
  })
})
