import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { TestFormValues } from '@/features/test-master/schemas/test.schemas'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import FieldLabel from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/input'

interface TestResourcePickerProps {
  isEdit: boolean
  resourceCount: number
}

// Edit mode shows a read-only count instead of a picker — the backend's
// mapper never returns resource-line item names, so there's no label to show.
const TestResourcePicker = ({ isEdit, resourceCount }: TestResourcePickerProps) => {
  const { control, formState: { errors } } = useFormContext<TestFormValues>()

  // Display-only labels for the create-mode pickers — never submitted.
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
            <>
              <InventoryMasterMultiPicker
                value={field.value.map((c) => c.id)}
                labels={consumableLabels}
                onChange={(ids, labels) => {
                  // Preserve each existing entry's quantity — only append
                  // quantity:1 for newly-picked ids, don't reset the rest.
                  const next = ids.map((id) => field.value.find((c) => c.id === id) ?? { id, quantity: 1 })
                  field.onChange(next)
                  setConsumableLabels(labels)
                }}
                type="consumable"
              />
              {field.value.length > 0 && (
                <div className="mt-1.5 space-y-1.5">
                  {field.value.map((c, index) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--qms-text-muted)' }}>
                        {consumableLabels[c.id] ?? c.id}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        step="any"
                        aria-label={`Quantity for ${consumableLabels[c.id] ?? c.id}`}
                        className="w-20 text-[13px]"
                        value={Number.isNaN(c.quantity) ? '' : c.quantity}
                        onChange={(e) => {
                          const quantity = e.currentTarget.value === '' ? Number.NaN : e.currentTarget.valueAsNumber
                          const next = [...field.value]
                          next[index] = { ...c, quantity }
                          field.onChange(next)
                        }}
                      />
                      {errors.consumableIds?.[index]?.quantity?.message && (
                        <p className="text-[11px] text-danger">{errors.consumableIds[index]?.quantity?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        />
      </div>
    </>
  )
}

export default TestResourcePicker
