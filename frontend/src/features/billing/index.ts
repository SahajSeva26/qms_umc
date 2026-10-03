// Public surface of the Billing feature — other features import from here, never from
// features/billing/{hooks,components}/* directly.
export { useInvoiceReport } from '@/features/billing/hooks/useInvoiceReport'
