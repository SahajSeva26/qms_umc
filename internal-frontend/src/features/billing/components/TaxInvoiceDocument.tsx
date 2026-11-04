import type { InvoiceEntity } from '@/types/invoice.types'
import type { InvoiceLineItemEntity } from '@/types/invoiceLineItem.types'
import type { Tenant } from '@/types/accessManagement.types'
import { QMS_LETTERHEAD } from '@/features/billing/invoicePrint.constants'
import { formatDate, formatINRFull } from '@/utils/formatters'
import { rupeesInWords } from '@/utils/numberToWords'

interface TaxInvoiceDocumentProps {
  invoice: InvoiceEntity
  buyer: Tenant | null
  lineItems: InvoiceLineItemEntity[]
}

const populatedCampLabel = (line: InvoiceLineItemEntity) => {
  if (typeof line.camp === 'string') return line.camp
  return `${line.camp.code} — ${formatDate(line.camp.date)}`
}

const addressLines = (address: Tenant['address']) => {
  if (!address) return []
  return [
    [address.addressLine1, address.addressLine2].filter(Boolean).join(', '),
    [address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean)
}

// CGST/SGST split shown on the sample format — the backend only stores one flat `tax` figure
// (no rate/split breakdown), so this is purely invoice.tax halved for DISPLAY ONLY, not a second
// source of truth. Clearly non-authoritative; the Sub Total/Tax/Total block above it already
// shows the real, authoritative figures.
const half = (n: number) => n / 2

// Every field below is either real backend data (invoice/buyer/line items) or intentionally left
// blank ('—' / empty cell) because no backend field or module backs it — never fabricated.
// Fields with NO backend correlate at all: IRN, Ack No/Date, buyer State Code/Contact/Phone/Fax/
// Email ID/PAN No, Challan No/Date, Order No/Date, Despatch Document No/Date, Despatched
// through/Destination, Payment Terms, HSN/SAC Code, Quantity, Rate, per-unit. The CGST/SGST split
// table is a display-only halving of the one real `invoice.tax` figure (see `half` above).
const TaxInvoiceDocument = ({ invoice, buyer, lineItems }: TaxInvoiceDocumentProps) => {
  const buyerAddress = addressLines(buyer?.address ?? null)
  const cgst = half(invoice.tax)
  const sgst = half(invoice.tax)

  return (
    <div className="tax-invoice-print bg-white text-black p-8 max-w-[800px] mx-auto text-[11px] leading-snug">
      <div className="text-[10px] mb-2">
        <div>IRN : —</div>
        <div>Ack No. : —</div>
        <div>Ack Date : —</div>
      </div>

      <div className="text-center font-bold text-[16px] mb-1">Tax Invoice</div>
      <div className="text-center font-extrabold text-[18px] mb-2">{QMS_LETTERHEAD.companyName}</div>
      <div className="text-center text-[10px] mb-1">
        Corporate address: {QMS_LETTERHEAD.corporateAddress}
        <br />
        Call us at: {QMS_LETTERHEAD.corporatePhone} &nbsp;Mail us at: {QMS_LETTERHEAD.corporateEmail}
      </div>
      <div className="text-center text-[10px] mb-3 border-b-2 border-black pb-2">
        Godown address: {QMS_LETTERHEAD.godownAddress}
        <br />
        Call us at: {QMS_LETTERHEAD.godownPhone}
      </div>

      <table className="w-full border-collapse mb-3">
        <tbody>
          <tr>
            <td className="border border-black p-2 align-top w-1/2">
              <div className="font-bold mb-1">Buyer (Bill to)</div>
              <div className="font-semibold">{buyer?.name ?? '—'}</div>
              {buyerAddress.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="mt-1">
                <div>State Code : —</div>
                <div>Contact : —</div>
                <div>Phone : —</div>
                <div>GST No. : {buyer?.gst ?? '—'}</div>
                <div>Fax No. : —</div>
                <div>Email ID : —</div>
                <div>Pan No. : —</div>
              </div>
            </td>
            <td className="border border-black p-2 align-top w-1/2">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="font-semibold pr-2">Invoice No :</td>
                    <td>{invoice.code}</td>
                    <td className="font-semibold pr-2 pl-3">Date :</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-2">Challan No :</td>
                    <td>—</td>
                    <td className="font-semibold pr-2 pl-3">Date :</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-2">Order No :</td>
                    <td>—</td>
                    <td className="font-semibold pr-2 pl-3">Date :</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-2">Despatch Document No :</td>
                    <td colSpan={1}>—</td>
                    <td className="font-semibold pr-2 pl-3">Date :</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-2">Despatched through :</td>
                    <td>—</td>
                    <td className="font-semibold pr-2 pl-3">Destination :</td>
                    <td>—</td>
                  </tr>
                  {invoice.dueDate && (
                    <tr>
                      <td className="font-semibold pr-2">Due date :</td>
                      <td colSpan={3}>{formatDate(invoice.dueDate)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="font-semibold pr-2">Payment Terms :</td>
                    <td colSpan={3}>—</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse mb-3">
        <thead>
          <tr>
            <th className="border border-black p-1.5 text-left">Description of Goods/Services (Camp)</th>
            <th className="border border-black p-1.5 text-center w-20">HSN/SAC Code</th>
            <th className="border border-black p-1.5 text-center w-16">Quantity</th>
            <th className="border border-black p-1.5 text-center w-16">Rate</th>
            <th className="border border-black p-1.5 text-center w-10">per</th>
            <th className="border border-black p-1.5 text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((line) => (
            <tr key={line.id}>
              <td className="border border-black p-1.5">{populatedCampLabel(line)}</td>
              <td className="border border-black p-1.5 text-center">—</td>
              <td className="border border-black p-1.5 text-center">—</td>
              <td className="border border-black p-1.5 text-center">—</td>
              <td className="border border-black p-1.5 text-center">—</td>
              <td className="border border-black p-1.5 text-right">{formatINRFull(line.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="border border-black p-1.5 text-right font-semibold">Sub Total</td>
            <td className="border border-black p-1.5 text-right font-semibold">{formatINRFull(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="border border-black p-1.5 text-right">Tax</td>
            <td className="border border-black p-1.5 text-right">{formatINRFull(invoice.tax)}</td>
          </tr>
          {invoice.discount > 0 && (
            <tr>
              <td colSpan={5} className="border border-black p-1.5 text-right">Discount</td>
              <td className="border border-black p-1.5 text-right">-{formatINRFull(invoice.discount)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={5} className="border border-black p-1.5 text-right font-bold">Total</td>
            <td className="border border-black p-1.5 text-right font-bold">{formatINRFull(invoice.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black p-2 mb-3 flex justify-between items-start">
        <div>
          <div className="font-semibold">Amount Chargeable (in words)</div>
          <div>Rupees {rupeesInWords(invoice.total)} only.</div>
        </div>
        <div className="text-[10px] shrink-0">E. &amp; O.E.</div>
      </div>

      {/* Display-only CGST/SGST split of the one real invoice.tax figure — see `half` above. */}
      <table className="w-full border-collapse mb-3 text-center">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-black p-1.5">HSN/SAC</th>
            <th rowSpan={2} className="border border-black p-1.5">Taxable Value</th>
            <th colSpan={2} className="border border-black p-1.5">CGST</th>
            <th colSpan={2} className="border border-black p-1.5">SGST/UTGST</th>
            <th rowSpan={2} className="border border-black p-1.5">Total Tax Amount</th>
          </tr>
          <tr>
            <th className="border border-black p-1">Rate</th>
            <th className="border border-black p-1">Amount</th>
            <th className="border border-black p-1">Rate</th>
            <th className="border border-black p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1.5">—</td>
            <td className="border border-black p-1.5">{formatINRFull(invoice.subtotal)}</td>
            <td className="border border-black p-1.5">—</td>
            <td className="border border-black p-1.5">{formatINRFull(cgst)}</td>
            <td className="border border-black p-1.5">—</td>
            <td className="border border-black p-1.5">{formatINRFull(sgst)}</td>
            <td className="border border-black p-1.5">{formatINRFull(invoice.tax)}</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-black p-1.5">Total</td>
            <td className="border border-black p-1.5">{formatINRFull(invoice.subtotal)}</td>
            <td className="border border-black p-1.5" colSpan={1}></td>
            <td className="border border-black p-1.5">{formatINRFull(cgst)}</td>
            <td className="border border-black p-1.5" colSpan={1}></td>
            <td className="border border-black p-1.5">{formatINRFull(sgst)}</td>
            <td className="border border-black p-1.5">{formatINRFull(invoice.tax)}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse mb-3">
        <tbody>
          <tr>
            <td className="border border-black p-2 align-top w-1/2">
              <div className="font-semibold mb-1">Declaration</div>
              <div className="text-[10px]" style={{ color: '#444' }}>
                Certified that the particulars given above are true and correct and the amount
                indicated represents the price actually charged and that there is no flow of
                additional consideration directly or indirectly from the buyer.
              </div>
              <div className="font-bold mt-3 mb-1">Bank Details</div>
              <div>Name of Bank : {QMS_LETTERHEAD.bank.name}</div>
              <div>Branch Name : {QMS_LETTERHEAD.bank.branch}</div>
              <div>Type of Account : {QMS_LETTERHEAD.bank.accountType}</div>
              <div>Name of the Beneficiary : {QMS_LETTERHEAD.bank.beneficiaryName}</div>
              <div>IFSC Code : {QMS_LETTERHEAD.bank.ifscCode}</div>
              <div>Account No. : {QMS_LETTERHEAD.bank.accountNo}</div>
              <div>Email id : —</div>
            </td>
            <td className="border border-black p-2 align-top w-1/2">
              {QMS_LETTERHEAD.drugLicenseNos.map((no) => (
                <div key={no}>Drug License No. : {no}</div>
              ))}
              <div>GST No : {QMS_LETTERHEAD.gstNo}</div>
              <div>PAN No. : {QMS_LETTERHEAD.panNo}</div>
              <div className="mt-6 text-right font-semibold">For {QMS_LETTERHEAD.companyName}</div>
              <div className="mt-8 text-right">Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default TaxInvoiceDocument
