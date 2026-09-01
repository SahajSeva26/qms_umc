import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { TestFormValues } from '@/features/test-master/schemas/test.schemas'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import FieldLabel from '@/components/ui/FieldLabel'

interface TestResourcePickerProps {
  isEdit: boolean
  resourceCount: number
}

// The two modes are genuinely different UIs, not the same component with a
// disabled flag: creating a test lets you pick real devices/consumables by
// name (InventoryMasterMultiPicker, live search, no display gap since
// nothing has round-tripped through the backend yet). Editing an existing
// test shows a read-only count instead — the backend's mapper never returns
// resource-line item names even when populated, so showing raw ids as if
// they were labels, or fetching each one individually to fake names, are
// both ruled out. Editing an existing test's resource list is out of scope
// until that backend gap is fixed.
const TestResourcePicker = ({ isEdit, resourceCount }: TestResourcePickerProps) => {
  const { control } = useFormContext<TestFormValues>()

  // Display-only labels for the create-mode pickers — never submitted.
  // Empty in create mode by construction (nothing is pre-selected yet).
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [consumableLabels, setConsumableLabels] = useState<Record<string, string>>({})

  if (isEdit) {
    return (
      <div className="rounded-xl border p-3 space-y-1 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
        <div>{resourceCount} resource{resourceCount === 1 ? '' : 's'}</div>
        <p className="mt-1">Devices/consumables can be set when a test is created; editing an existing test's resource list isn't supported yet.</p>
      </div>
    )
  }

  return (
    <>
      <div>
        <FieldLabel>Devices required</FieldLabel>
        <Controller
          control={control}
          name="requiredDeviceIds"
          render={({ field }) => (
            <InventoryMasterMultiPicker
              value={field.value}
              labels={deviceLabels}
              onChange={(ids, labels) => { field.onChange(ids); setDeviceLabels(labels) }}
              type="device"
            />
          )}
        />
      </div>
      <div>
        <FieldLabel>Consumables required</FieldLabel>
        <Controller
          control={control}
          name="consumableIds"
          render={({ field }) => (
            <InventoryMasterMultiPicker
              value={field.value}
              labels={consumableLabels}
              onChange={(ids, labels) => { field.onChange(ids); setConsumableLabels(labels) }}
              type="consumable"
            />
          )}
        />
      </div>
    </>
  )
}

export default TestResourcePicker
