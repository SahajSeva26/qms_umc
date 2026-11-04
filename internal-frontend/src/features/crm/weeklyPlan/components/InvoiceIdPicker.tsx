import { useState } from 'react'
import { useInvoicesShared } from '@/hooks/useInvoicesShared'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { InvoiceEntity } from '@/types/invoice.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface InvoiceIdPickerProps {
  value: string
  label: string
  tenantId?: string
  onChange: (invoiceId: string, invoiceLabel: string) => void
}

const invoiceLabel = (invoice: InvoiceEntity) => `${invoice.code} · ₹${invoice.total.toLocaleString('en-IN')}`

// Single-select search over GET /invoices, scoped by tenant; code is searched server-side.
const InvoiceIdPicker = ({ value, label, tenantId, onChange }: InvoiceIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching, isError, refetch } = useInvoicesShared(
    { tenant: tenantId || undefined, code: debouncedQuery.trim() || undefined, limit: '10' },
    !!tenantId,
  )
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<InvoiceEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      isError={isError}
      errorText="Couldn't search invoices."
      onRetry={() => { void refetch() }}
      getId={(invoice) => invoice.id}
      getLabel={invoiceLabel}
      searchPlaceholder={tenantId ? 'Search invoice by code...' : 'Select a company first'}
      clearAriaLabel="Clear linked invoice"
      emptyQueryText={tenantId ? 'Type an invoice code to filter, or pick from the list.' : undefined}
      noResultsText="No matching invoices found."
      disabled={!tenantId}
      renderResult={(invoice) => <span className="truncate">{invoiceLabel(invoice)}</span>}
    />
  )
}

export default InvoiceIdPicker
