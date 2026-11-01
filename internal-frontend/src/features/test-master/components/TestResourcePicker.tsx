import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { TestFormValues } from '@/features/test-master/schemas/test.schemas'
import type { TestConsumptionLine } from '@/features/test-master/testMaster.types'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import { INVENTORY_MASTER_TYPE_LABEL } from '@/types/inventoryMaster.types'
import FieldLabel from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/input'

interface TestResourcePickerProps {
  isEdit: boolean
  // Edit mode only — GET /:id populates each line's item ({id,code,name,type});
  // search/create responses leave it unpopulated, but edit mode always loads via GET /:id first.
  consumption: TestConsumptionLine[]
}

// Edit mode shows a read-only list (names, codes, device/consumable type, consumable rate) —
// only create-mode gets the pickers. This is a frontend limitation, not a backend one: the
// update endpoint's payload schema does accept `consumption`, this UI just doesn't expose
// editing it yet (see UpdateTestPayload, which omits it for the same reason).
const TestResourcePicker = ({ isEdit, consumption }: TestResourcePickerProps) => {
  const { control, formState: { errors } } = useFormContext<TestFormValues>()

  // Display-only labels for the create-mode pickers — never submitted.
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [consumableLabels, setConsumableLabels] = useState<Record<string, string>>({})

  if (isEdit) {
    if (consumption.length === 0) {
      return (
        <div className="rounded-xl border p-3 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No devices or consumables required for this test.
        </div>
      )
    }
    return (
      <div>
        <FieldLabel>Devices &amp; consumables required</FieldLabel>
        <div className="rounded-xl border divide-y text-[12px]" style={{ borderColor: 'var(--qms-border)' }}>
          {consumption.map((line, index) => (
            <div key={line.item.id || index} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium truncate" style={{ color: 'var(--qms-text)' }}>
                  {line.item.name ?? line.item.id}
                </div>
                {line.item.code && (
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{line.item.code}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0" style={{ color: 'var(--qms-text-muted)' }}>
                {line.item.type && <span>{INVENTORY_MASTER_TYPE_LABEL[line.item.type as keyof typeof INVENTORY_MASTER_TYPE_LABEL] ?? line.item.type}</span>}
                {line.item.type === 'consumable' && <span>· qty {line.rate}</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Devices/consumables can be set when a test is created; editing an existing test's resource list isn't supported yet.
        </p>
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
