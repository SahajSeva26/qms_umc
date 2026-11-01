import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addYears, format } from 'date-fns'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    updateInventoryDevice: vi.fn(async () => ({ success: true, message: '', data: { id: 'device-1' } })),
  },
}))

const device: InventoryDeviceEntity = {
  id: 'device-1',
  item: { id: 'item-1', name: 'Glucometer' },
  vendor: null,
  serialNumber: 'GLUC-0106',
  status: 'available',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const pickDate = async (user: ReturnType<typeof userEvent.setup>, triggerName: RegExp, date: Date) => {
  await user.click(screen.getByRole('button', { name: triggerName }))
  await user.selectOptions(screen.getByRole('combobox', { name: /choose the month/i }), String(date.getMonth()))
  await user.selectOptions(screen.getByRole('combobox', { name: /choose the year/i }), String(date.getFullYear()))
  await user.click(screen.getByRole('button', { name: new RegExp(`^${format(date, 'PPPP')}`, 'i') }))
}

describe('MarkDeviceCalibratedModal', () => {
  it('records the completion and next-due dates through the existing device update contract', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const MarkDeviceCalibratedModal = (await import('./MarkDeviceCalibratedModal')).default
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const user = userEvent.setup()
    const onClose = vi.fn()
    const nextDate = addYears(new Date(), 1)

    render(
      <QueryClientProvider client={queryClient}>
        <MarkDeviceCalibratedModal device={device} onClose={onClose} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('GLUC-0106')).toBeInTheDocument()
    await pickDate(user, /^Pick a date$/, nextDate)
    await user.click(screen.getByRole('button', { name: /^mark done$/i }))

    await waitFor(() => {
      expect(inventoryDeviceService.updateInventoryDevice).toHaveBeenCalledWith('device-1', {
        lastCalibrationDate: format(new Date(), 'yyyy-MM-dd'),
        nextCalibrationDate: format(nextDate, 'yyyy-MM-dd'),
      })
    })
    expect(onClose).toHaveBeenCalled()
  })
})
