import { z } from 'zod'

// Validates the "New stock transfer" form (NewTransferInput) shared by
// WarehouseTab.tsx and TransfersTab.tsx's own NewTransferModal — both call
// saveTransfer() with this exact shape and both currently duplicate the same
// two manual checks ("Pick different source and destination", "Enter
// quantity"). `qty` is tightened from the existing "truthy" check (which let
// negative quantities through) to a genuine positive-quantity rule, matching
// what "enter a quantity" already implies. Logistics costs are optional
// non-negative — no cost field is currently required, but a negative
// courier/freight/packaging/handling charge doesn't make sense either.
export const transferSchema = z
  .object({
    from: z.string().trim().min(1, 'Select a source location'),
    to: z.string().trim().min(1, 'Select a destination location'),
    itemId: z.string().trim().min(1, 'Select an item'),
    qty: z.number().positive('Enter a quantity greater than 0'),
    courier: z.number().min(0, 'Courier cost cannot be negative'),
    freight: z.number().min(0, 'Freight cost cannot be negative'),
    packaging: z.number().min(0, 'Packaging cost cannot be negative'),
    handling: z.number().min(0, 'Handling cost cannot be negative'),
    notes: z.string().optional(),
  })
  .refine((v) => v.from !== v.to, {
    message: 'Pick different source and destination',
    path: ['to'],
  })

export type TransferForm = z.infer<typeof transferSchema>
