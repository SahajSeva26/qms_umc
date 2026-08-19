import { useState } from 'react'
import { FiPlus, FiTrendingUp, FiEdit2, FiSave } from 'react-icons/fi'
import { TbBuilding } from 'react-icons/tb'
import { Button } from '@/components/ui/button'
import SideDrawer from '@/components/ui/SideDrawer'
import SectionHeader from '@/components/ui/SectionHeader'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useVendors, useVendorPriceHistory } from '@/features/inventory/hooks/useInventory'
import { inr, vendorOverallScore, vendorTone, vendorPriceTrend } from '@/features/inventory/inventory.service'
import type { VendorFormValues } from '@/features/inventory/inventory.service'
import type { Vendor } from '@/features/inventory/inventory.types'
import { vendorSchema } from '@/features/inventory/schemas/vendor.schema'
import { InvFilterBar } from '@/features/inventory/components/IntelTableUi'

const inputCls = 'w-full rounded-lg border text-xs px-2.5 py-1.5'
const inputStyle = { borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
    {children}
  </div>
)

const blankForm: VendorFormValues = {
  name: '', category: '', gst: '', pan: '', contact: '', phone: '', email: '', city: '',
  deliveryScore: 85, qualityScore: 88, costScore: 80, complaintRate: '1.0',
}

const formFromVendor = (v: Vendor): VendorFormValues => ({
  name: v.name,
  category: v.category,
  gst: v.gst,
  pan: v.pan,
  contact: v.contact,
  phone: v.phone,
  email: v.email,
  city: v.city,
  deliveryScore: v.deliveryScore,
  qualityScore: v.qualityScore,
  costScore: v.costScore,
  complaintRate: v.complaintRate,
})

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="text-[11px]" style={{ color: 'var(--qms-text-soft)' }}>
    <div>
      {label} <b className="text-[15px]" style={{ color: 'var(--qms-text)' }}>{value}</b>
    </div>
    <div className="h-[5px] rounded-full overflow-hidden mt-[3px]" style={{ minWidth: 70, background: 'rgba(0,0,0,.07)' }}>
      <div className="h-full" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
)

// Always emerald regardless of the actual score value — deliberate.
const OverallBadge = ({ value }: { value: number }) => (
  <span
    className="inline-flex items-center font-bold rounded-full"
    style={{ padding: '2px 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.03em', background: 'rgba(16,185,129,.15)', color: '#059669' }}
  >
    {value}
  </span>
)

// Listing is a CSS-grid card gallery, not a table — the only tab in the
// module that renders its list this way. No page-level KPI strip or
// search/filter controls, both deliberate.
const VendorsTab = () => {
  const { vendors, saveVendor } = useVendors()
  const { priceHistory } = useVendorPriceHistory()
  void priceHistory

  const [openVendorId, setOpenVendorId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<VendorFormValues>(blankForm)
  const [saving, setSaving] = useState(false)

  const openVendor = vendors.find((v) => v.id === openVendorId) ?? null

  const openCreate = (id?: string) => {
    const editing = id ? vendors.find((v) => v.id === id) : null
    setEditId(id ?? null)
    setForm(editing ? formFromVendor(editing) : blankForm)
    setModalOpen(true)
  }

  const set = <K extends keyof VendorFormValues>(k: K, v: VendorFormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const result = vendorSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    setSaving(true)
    try {
      const rec = await saveVendor(editId, form)
      setModalOpen(false)
      toast.success((editId ? 'Updated ' : 'Added ') + rec.name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Vendor Master
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {vendors.length} vendors
        </span>
        <Button onClick={() => openCreate()}>
          <FiPlus size={14} /> New vendor
        </Button>
      </InvFilterBar>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {vendors.map((v) => {
          const overall = vendorOverallScore(v)
          const tone = vendorTone(overall)
          return (
            <div
              key={v.id}
              onClick={() => setOpenVendorId(v.id)}
              className="rounded-[14px] border cursor-pointer"
              style={{ padding: 16, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex gap-2.5 items-center mb-2.5">
                <div
                  className="rounded-[10px] text-white grid place-items-center font-extrabold shrink-0"
                  style={{ width: 38, height: 38, background: tone }}
                >
                  {v.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{v.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--qms-text-muted)' }}>{v.category} · {v.city}</div>
                </div>
                <OverallBadge value={overall} />
              </div>

              <div className="flex gap-2.5 flex-wrap">
                <ScoreBar label="Delivery" value={v.deliveryScore} color="#3b6dff" />
                <ScoreBar label="Quality" value={v.qualityScore} color="#10b981" />
                <ScoreBar label="Cost" value={v.costScore} color="#f59e0b" />
              </div>

              <div className="text-xs mt-2" style={{ color: 'var(--qms-text-muted)' }}>
                Complaint rate {v.complaintRate}% · {v.priceListNote}
              </div>
            </div>
          )
        })}
      </div>

      <SideDrawer
        open={!!openVendor}
        title={openVendor?.name ?? 'Vendor'}
        onClose={() => setOpenVendorId(null)}
        widthClassName="max-w-[940px]"
      >
        {openVendor && (
          <VendorDetailDrawerBody
            vendor={openVendor}
            onEdit={() => { setOpenVendorId(null); openCreate(openVendor.id) }}
            onClose={() => setOpenVendorId(null)}
          />
        )}
      </SideDrawer>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[640px] w-[92vw] sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit vendor' : 'New vendor'}</DialogTitle>
            <DialogDescription>Vendor Master</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor name">
              <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Product category">
              <input className={inputCls} style={inputStyle} value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <Field label="GST">
              <input className={inputCls} style={inputStyle} value={form.gst ?? ''} onChange={(e) => set('gst', e.target.value)} />
            </Field>
            <Field label="PAN">
              <input className={inputCls} style={inputStyle} value={form.pan ?? ''} onChange={(e) => set('pan', e.target.value)} />
            </Field>
            <Field label="Contact person">
              <input className={inputCls} style={inputStyle} value={form.contact ?? ''} onChange={(e) => set('contact', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} style={inputStyle} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputCls} style={inputStyle} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="City">
              <input className={inputCls} style={inputStyle} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Delivery score">
              <input type="number" className={inputCls} style={inputStyle} value={form.deliveryScore ?? 85} onChange={(e) => set('deliveryScore', Number(e.target.value))} />
            </Field>
            <Field label="Quality score">
              <input type="number" className={inputCls} style={inputStyle} value={form.qualityScore ?? 88} onChange={(e) => set('qualityScore', Number(e.target.value))} />
            </Field>
            <Field label="Cost score">
              <input type="number" className={inputCls} style={inputStyle} value={form.costScore ?? 80} onChange={(e) => set('costScore', Number(e.target.value))} />
            </Field>
            <Field label="Complaint rate %">
              <input type="number" step="0.1" className={inputCls} style={inputStyle} value={form.complaintRate ?? '1.0'} onChange={(e) => set('complaintRate', e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <FiSave size={14} /> {editId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const VendorDetailDrawerBody = ({ vendor, onEdit, onClose }: { vendor: Vendor; onEdit: () => void; onClose: () => void }) => {
  const overall = vendorOverallScore(vendor)
  const trend = vendorPriceTrend(vendor.name)

  return (
    <div>
      <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { l: 'Overall', v: String(overall), d: 'scorecard' },
          { l: 'Delivery', v: String(vendor.deliveryScore), d: 'on-time' },
          { l: 'Quality', v: String(vendor.qualityScore), d: 'accept rate' },
          { l: 'Complaints', v: `${vendor.complaintRate}%`, d: 'of orders' },
        ].map((k) => (
          <div key={k.l} className="rounded-[14px] border" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[10px] uppercase tracking-[.04em] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{k.l}</div>
            <div className="text-lg font-extrabold tracking-[-.02em] mt-0.5" style={{ color: 'var(--qms-text)' }}>{k.v}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{k.d}</div>
          </div>
        ))}
      </div>

      {/* Registration */}
      <SectionHeader icon={TbBuilding} spaced={false}>Registration</SectionHeader>
      <div className="rounded-xl border mb-3.5" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <KeyValueGrid
          items={[
            { label: 'GST', value: vendor.gst },
            { label: 'PAN', value: vendor.pan },
            { label: 'Contact', value: vendor.contact },
            { label: 'Email', value: vendor.email },
            { label: 'Phone', value: vendor.phone },
            { label: 'City / State', value: `${vendor.city} · ${vendor.state}` },
            { label: 'Price list', value: vendor.priceListNote },
          ]}
        />
      </div>

      {/* Price history */}
      <SectionHeader icon={FiTrendingUp}>{`Price history (${trend.length} items)`}</SectionHeader>
      {trend.length === 0 ? (
        <div className="text-xs mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>No supply history.</div>
      ) : (
        <div className="overflow-x-auto mb-3.5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Item', 'Latest rate', 'Landed', 'Trend'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left font-bold uppercase tracking-[.04em] ${i >= 1 ? 'text-right' : ''}`}
                    style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((row) => {
                const chgColor = row.changePct > 5 ? '#e11d48' : row.changePct < 0 ? '#059669' : 'var(--qms-text-muted)'
                return (
                  <tr key={row.itemName} className="hover:bg-[rgba(59,109,255,.03)]">
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{row.itemName}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(row.latestRate)}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(row.landed)}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: chgColor }}>
                      {row.changePct > 0 ? '+' : ''}{row.changePct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap mt-3.5">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium"
          style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <FiEdit2 size={14} /> Edit
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium ml-auto"
          style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default VendorsTab
