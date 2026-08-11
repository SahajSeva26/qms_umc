import { useMemo, useState } from 'react'
import {
  Search, Plus, Hash, Wallet, Activity, ShieldCheck, TrendingDown, Box, Fingerprint,
  ReceiptIndianRupee, Pencil, Save,
  Cpu, Package, Megaphone, Laptop, Armchair,
} from 'lucide-react'
import type { IconType } from 'react-icons'
import { Button } from '@/components/ui/button'
import SideDrawer from '@/components/ui/SideDrawer'
import SectionHeader from '@/components/ui/SectionHeader'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import {
  useItemMaster, useItemMasterFilters, useItemMasterList, useDeviceCatalog, useTestCatalog,
} from '@/features/inventory/hooks/useInventory'
import {
  ITEM_TYPES, ITEM_TYPE_META, ASSET_STATUSES, DEPRECIATION_METHODS,
  isAssetType, isConsumableType,
} from '@/features/inventory/inventory.types'
import type { ItemType, InventoryItem, AssetStatus, DepreciationMethod } from '@/features/inventory/inventory.types'
import {
  inr, inrShort, expiryBand, remainingLabel, itemValue, testName,
} from '@/features/inventory/inventory.service'
import type { ItemFormValues } from '@/features/inventory/inventory.service'
import { itemSchema } from '@/features/inventory/schemas/item.schema'
import { EXPIRY_BAND_STYLE } from '@/features/inventory/constants/expiryBandStyle'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'

// lucide icon lookup, keyed by the exact icon names TYPE_META uses in the
// prototype (inventory-masters.js:50-57) — cpu/package/box/megaphone/laptop/armchair.
const TYPE_ICON: Record<ItemType, typeof Cpu> = {
  'Device': Cpu,
  'Consumable': Package,
  'General Consumable': Box,
  'Marketing Material': Megaphone,
  'IT Asset': Laptop,
  'Office Asset': Armchair,
}

const ExpiryBandPill = ({ css, label }: { css: 'green' | 'yellow' | 'orange' | 'red'; label: string }) => {
  const s = EXPIRY_BAND_STYLE[css]
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.03em', background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  )
}

// .inv-status-pill.inv-status-OK — exact quirk preserved from the prototype:
// every asset status text renders with the SAME green "OK" styling
// regardless of the actual assetStatus value (inventory-masters.js:279).
const AssetStatusPill = ({ text }: { text: string }) => (
  <span
    className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
    style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.04em', background: 'rgba(16,185,129,.15)', color: '#059669' }}
  >
    {text}
  </span>
)

// .im-pill — Type column badge: type color at ~10% alpha bg / full color fg,
// per-type icon (exact port of inventory-masters.js:272).
const TypePill = ({ type }: { type: ItemType }) => {
  const meta = ITEM_TYPE_META[type]
  const Icon = TYPE_ICON[type]
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold rounded-full"
      style={{ padding: '2px 8px', fontSize: 11, background: `${meta.color}1a`, color: meta.color }}
    >
      <Icon size={11} /> {type}
    </span>
  )
}

interface FieldsProps {
  type: ItemType
  form: ItemFormValues
  setForm: (updater: (f: ItemFormValues) => ItemFormValues) => void
  deviceOptions: { id: string; name: string }[]
  testOptions: { id: string; name: string }[]
}

// text/date/number field helpers rendering the `.form-grid` 2-col layout —
// exact field set per fieldsFor()'s 3 variants (inventory-masters.js:448-494).
const Field = ({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
    {children}
  </div>
)

const inputCls = 'w-full rounded-lg border text-xs px-2.5 py-1.5'
const inputStyle = { borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }

const ItemFormFields = ({ type, form, setForm, deviceOptions, testOptions }: FieldsProps) => {
  const set = <K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  const common = (
    <>
      <Field label="Name"><input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Item / device code"><input className={inputCls} style={inputStyle} value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></Field>
      <Field label="Category"><input className={inputCls} style={inputStyle} value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} /></Field>
      <Field label="Vendor"><input className={inputCls} style={inputStyle} value={form.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} /></Field>
    </>
  )

  if (type === 'Device' || type === 'IT Asset' || type === 'Office Asset') {
    return (
      <>
        {common}
        <Field label="Manufacturer"><input className={inputCls} style={inputStyle} value={form.manufacturer ?? ''} onChange={(e) => set('manufacturer', e.target.value)} /></Field>
        <Field label={type === 'Device' ? 'Model number' : 'Model'}><input className={inputCls} style={inputStyle} value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} /></Field>
        <Field label="Serial number"><input className={inputCls} style={inputStyle} value={form.serialNo ?? ''} onChange={(e) => set('serialNo', e.target.value)} /></Field>
        <Field label="QR code"><input className={inputCls} style={inputStyle} value={form.qrCode ?? ''} onChange={(e) => set('qrCode', e.target.value)} /></Field>
        {type === 'Device' && (
          <Field label="Barcode"><input className={inputCls} style={inputStyle} value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} /></Field>
        )}

        <Field label="Purchase date"><input type="date" className={inputCls} style={inputStyle} value={form.purchaseDate ?? ''} onChange={(e) => set('purchaseDate', e.target.value)} /></Field>
        <Field label="Purchase cost"><input type="number" className={inputCls} style={inputStyle} value={form.purchaseCost ?? ''} onChange={(e) => set('purchaseCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="GST %"><input type="number" className={inputCls} style={inputStyle} value={form.gst ?? 18} onChange={(e) => set('gst', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Invoice number"><input className={inputCls} style={inputStyle} value={form.invoiceNo ?? ''} onChange={(e) => set('invoiceNo', e.target.value)} /></Field>

        <Field label="Warranty (years)"><input type="number" className={inputCls} style={inputStyle} value={form.warrantyYears ?? (type === 'Device' ? 2 : 1)} onChange={(e) => set('warrantyYears', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        {type === 'Device' && (
          <Field label="Warranty end"><input type="date" className={inputCls} style={inputStyle} value={form.warrantyEnd ?? ''} onChange={(e) => set('warrantyEnd', e.target.value)} /></Field>
        )}
        <Field label="AMC applicable">
          <select className={inputCls} style={inputStyle} value={form.amcApplicable ? 'Yes' : 'No'} onChange={(e) => set('amcApplicable', e.target.value === 'Yes')}>
            <option>No</option><option>Yes</option>
          </select>
        </Field>
        <Field label="AMC cost"><input type="number" className={inputCls} style={inputStyle} value={form.amcCost ?? ''} onChange={(e) => set('amcCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>

        {type === 'Device' && (
          <>
            <Field label="Calibration applicable">
              <select className={inputCls} style={inputStyle} value={form.calibApplicable === false ? 'No' : 'Yes'} onChange={(e) => set('calibApplicable', e.target.value !== 'No')}>
                <option>Yes</option><option>No</option>
              </select>
            </Field>
            <Field label="Calib freq days"><input type="number" className={inputCls} style={inputStyle} value={form.calibFreqDays ?? 365} onChange={(e) => set('calibFreqDays', e.target.value === '' ? null : Number(e.target.value))} /></Field>
            <Field label="Calib due"><input type="date" className={inputCls} style={inputStyle} value={form.calibDue ?? ''} onChange={(e) => set('calibDue', e.target.value)} /></Field>
          </>
        )}

        <Field label="Useful life (yr)"><input type="number" className={inputCls} style={inputStyle} value={form.usefulLifeYears ?? (type === 'Device' ? 5 : 5)} onChange={(e) => set('usefulLifeYears', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Depreciation method">
          <select className={inputCls} style={inputStyle} value={form.deprMethod ?? (type === 'Device' ? 'Straight Line' : 'Written Down Value')} onChange={(e) => set('deprMethod', e.target.value as DepreciationMethod)}>
            {DEPRECIATION_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Depreciation %"><input type="number" className={inputCls} style={inputStyle} value={form.deprPct ?? (type === 'Device' ? 20 : 15)} onChange={(e) => set('deprPct', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Current value"><input type="number" className={inputCls} style={inputStyle} value={form.currentValue ?? ''} onChange={(e) => set('currentValue', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Asset status">
          <select className={inputCls} style={inputStyle} value={form.assetStatus ?? 'Available'} onChange={(e) => set('assetStatus', e.target.value as AssetStatus)}>
            {ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        {type === 'Device' && (
          <Field label="Device → Test mapping" full>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
              {testOptions.map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--qms-text)' }}>
                  <input
                    type="checkbox"
                    checked={(form.usedForTests ?? []).includes(t.id)}
                    onChange={(e) => {
                      const cur = new Set(form.usedForTests ?? [])
                      if (e.target.checked) cur.add(t.id); else cur.delete(t.id)
                      set('usedForTests', Array.from(cur))
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </Field>
        )}
      </>
    )
  }

  // Consumable / General Consumable / Marketing Material
  return (
    <>
      {common}
      <Field label="Linked device">
        <select className={inputCls} style={inputStyle} value={form.linkedDeviceId ?? ''} onChange={(e) => set('linkedDeviceId', e.target.value)}>
          <option value="">— none —</option>
          {deviceOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Unit (UOM)"><input className={inputCls} style={inputStyle} value={form.uom ?? 'pack'} onChange={(e) => set('uom', e.target.value)} /></Field>
      <Field label="Quantity"><input type="number" className={inputCls} style={inputStyle} value={form.qtyOnHand ?? ''} onChange={(e) => set('qtyOnHand', e.target.value === '' ? null : Number(e.target.value))} /></Field>

      <Field label="Cost / unit"><input type="number" className={inputCls} style={inputStyle} value={form.purchaseCost ?? ''} onChange={(e) => set('purchaseCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>
      <Field label="GST %"><input type="number" className={inputCls} style={inputStyle} value={form.gst ?? 12} onChange={(e) => set('gst', e.target.value === '' ? null : Number(e.target.value))} /></Field>
      <Field label="Reorder level"><input type="number" className={inputCls} style={inputStyle} value={form.reorderLevel ?? ''} onChange={(e) => set('reorderLevel', e.target.value === '' ? null : Number(e.target.value))} /></Field>

      <Field label="Batch number"><input className={inputCls} style={inputStyle} value={form.batchNo ?? ''} onChange={(e) => set('batchNo', e.target.value)} /></Field>
      <Field label="Manufacturing date"><input type="date" className={inputCls} style={inputStyle} value={form.mfgDate ?? ''} onChange={(e) => set('mfgDate', e.target.value)} /></Field>
      <Field label="Expiry date"><input type="date" className={inputCls} style={inputStyle} value={form.expiryDate ?? ''} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
      <Field label="Storage requirement"><input className={inputCls} style={inputStyle} value={form.storage ?? ''} onChange={(e) => set('storage', e.target.value)} /></Field>
    </>
  )
}

const blankForm = (type: ItemType): ItemFormValues => ({ itemType: type, name: '' })

const formFromItem = (it: InventoryItem): ItemFormValues => ({
  itemType: it.itemType,
  name: it.name,
  code: it.code,
  category: it.category,
  vendor: it.vendor,
  gst: it.gst,
  purchaseCost: it.purchaseCost,
  manufacturer: it.manufacturer,
  model: it.model,
  serialNo: it.serialNo,
  qrCode: it.qrCode,
  barcode: it.barcode,
  purchaseDate: it.purchaseDate,
  invoiceNo: it.invoiceNo,
  warrantyYears: it.warrantyYears,
  warrantyEnd: it.warrantyEnd,
  amcApplicable: it.amcApplicable,
  amcCost: it.amcCost,
  usefulLifeYears: it.usefulLifeYears,
  deprMethod: it.deprMethod,
  deprPct: it.deprPct,
  currentValue: it.currentValue,
  assetStatus: it.assetStatus,
  calibApplicable: it.calibApplicable,
  calibFreqDays: it.calibFreqDays,
  calibDue: it.calibDue,
  usedForTests: it.usedForTests,
  uom: it.uom,
  qtyOnHand: it.qtyOnHand,
  reorderLevel: it.reorderLevel,
  batchNo: it.batchNo,
  mfgDate: it.mfgDate,
  expiryDate: it.expiryDate,
  storage: it.storage,
  linkedDeviceId: it.linkedDeviceId,
})

// Exact port of window.QMS_InvMasters.tabItemMaster() (inventory-masters.js:
// 251-305) — type-filter strip, sticky filter/toolbar row, and the 8-column
// item table. Detail drawer (openItem()) + create/edit modal (openCreate())
// are the other two prototype surfaces, ported below as SideDrawer/Dialog.
const ItemMasterTab = () => {
  const { items, saveItem } = useItemMaster()
  const { devices } = useDeviceCatalog()
  const { tests } = useTestCatalog()
  const { type, toggleType, setType, q, setQ } = useItemMasterFilters()
  const rows = useItemMasterList(items, type, q)

  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemFormValues>(blankForm('Device'))
  const [saving, setSaving] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    ITEM_TYPES.forEach((t) => { c[t] = items.filter((x) => x.itemType === t).length })
    return c
  }, [items])

  // Toolbar total — summed over ALL items regardless of active filter, exact
  // port of tabItemMaster()'s totalValue reduce (inventory-masters.js:283).
  const totalValue = useMemo(() => items.reduce((a, it) => a + itemValue(it), 0), [items])

  const openItem = items.find((x) => x.id === openItemId) ?? null

  const deviceOptions = useMemo(() => devices.map((d) => ({ id: d.id, name: d.name })), [devices])
  const testOptions = useMemo(() => tests.map((t) => ({ id: t.id, name: t.name })), [tests])

  const openCreate = (id?: string) => {
    const editing = id ? items.find((x) => x.id === id) : null
    setEditId(id ?? null)
    setForm(editing ? formFromItem(editing) : blankForm('Device'))
    setModalOpen(true)
  }

  const handlePickType = (t: ItemType) => {
    setForm(blankForm(t))
  }

  const handleSave = async () => {
    const result = itemSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    setSaving(true)
    try {
      const rec = await saveItem(editId, form)
      setModalOpen(false)
      toast.success((editId ? 'Updated ' : 'Created ') + rec.name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* .im-type-strip — 6 clickable type-filter cards */}
      <div className="flex gap-2 flex-wrap mb-3.5">
        {ITEM_TYPES.map((t) => {
          const meta = ITEM_TYPE_META[t]
          const Icon = TYPE_ICON[t]
          const active = type === t
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className="flex-1 flex items-center gap-2.5 rounded-xl border text-left transition-transform hover:-translate-y-0.5"
              style={{
                minWidth: 120,
                padding: 12,
                background: 'var(--qms-surface)',
                borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
                boxShadow: active ? 'inset 0 0 0 1px var(--qms-brand)' : undefined,
              }}
            >
              <div className="w-8.5 h-8.5 rounded-[9px] grid place-items-center shrink-0 text-white" style={{ width: 34, height: 34, background: meta.color }}>
                <Icon size={17} />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{t}</div>
                <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{counts[t] ?? 0}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* .inv-filter — sticky search + type select + counter + New item */}
      <InvFilterBar>
        <Search size={14} style={{ color: 'var(--qms-text-muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code, vendor…"
          className="rounded-lg border text-xs px-2.5 py-1.5"
          style={{ minWidth: 220, flex: 1, borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border text-xs px-2.5 py-1.5"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }}
        >
          <option value="ALL">All types</option>
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {rows.length} of {items.length} items · {inrShort(totalValue)} value
        </span>
        <Button onClick={() => { openCreate(); }}>
          <Plus size={14} /> New item
        </Button>
      </InvFilterBar>

      {/* .inv-card padding:0;overflow:auto — 8-column item table */}
      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 760 }}>
          <thead>
            <tr>
              {['Type', 'Code', 'Name', 'Category', 'Vendor', 'On hand', 'Value', 'Status / Expiry'].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase ${i >= 5 && i <= 6 ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <TableEmptyRow colSpan={8}>No items match this filter.</TableEmptyRow>
            ) : (
              rows.map((it) => {
                const band = isConsumableType(it.itemType) ? expiryBand(it.expiryDate) : null
                const value = itemValue(it)
                return (
                  <tr
                    key={it.id}
                    onClick={() => setOpenItemId(it.id)}
                    className="cursor-pointer hover:bg-[rgba(59,109,255,.03)]"
                  >
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}><TypePill type={it.itemType} /></td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}><b style={{ color: 'var(--qms-text)' }}>{it.code || '—'}</b></td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.name}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{it.category || '—'}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{it.vendor || '—'}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.qtyOnHand ?? '—'}{it.uom ? ` ${it.uom}` : ''}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(value)}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      {band ? <ExpiryBandPill css={band.css} label={band.label} /> : it.assetStatus ? <AssetStatusPill text={it.assetStatus} /> : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer — exact port of openItem() (inventory-masters.js:362-445) */}
      <SideDrawer open={!!openItem} title={openItem?.name ?? 'Item'} onClose={() => setOpenItemId(null)} widthClassName="max-w-3xl">
        {openItem && (
          <ItemDetailDrawerBody
            item={openItem}
            onEdit={() => { setOpenItemId(null); openCreate(openItem.id) }}
            onClose={() => setOpenItemId(null)}
          />
        )}
      </SideDrawer>

      {/* Create/edit modal — exact port of openCreate()/fieldsFor()/saveItem() */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[720px] w-[92vw] sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit item' : 'New item'}</DialogTitle>
            <DialogDescription>{editId ? form.name : 'Pick item type, then fill the master'}</DialogDescription>
          </DialogHeader>

          <div className="mb-1">
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              Item type <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.itemType}
              disabled={!!editId}
              onChange={(e) => handlePickType(e.target.value as ItemType)}
            >
              {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="overflow-auto pr-1" style={{ maxHeight: '60vh' }}>
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-3">
              <ItemFormFields type={form.itemType} form={form} setForm={setForm} deviceOptions={deviceOptions} testOptions={testOptions} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={14} /> {editId ? 'Save changes' : 'Create item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Detail drawer body — exact port of openItem()'s HTML assembly ─────────
// Exported (not just used locally) — the Expiry/FEFO tab opens the SAME
// shared drawer (openItem(id) is one function in the prototype, reused
// verbatim rather than re-implemented) since both tabs read the same
// qms.inventory.items store.
export const ItemDetailDrawerBody = ({ item, onEdit, onClose }: { item: InventoryItem; onEdit: () => void; onClose: () => void }) => {
  const meta = ITEM_TYPE_META[item.itemType]
  const Icon = TYPE_ICON[item.itemType]
  const band = isConsumableType(item.itemType) && item.expiryDate ? expiryBand(item.expiryDate) : null
  const asset = isAssetType(item.itemType)
  const consumable = isConsumableType(item.itemType)

  return (
    <div>
      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="w-15 h-15 rounded-[14px] grid place-items-center text-white shrink-0" style={{ width: 60, height: 60, background: meta.color }}>
          <Icon size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{item.name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {item.itemType}{item.category ? ` · ${item.category}` : ''}{item.vendor ? ` · ${item.vendor}` : ''}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold" style={{ padding: '2px 8px', background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }}>
              <Hash size={11} /> {item.code || '—'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold" style={{ padding: '2px 8px', background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }}>
              <Wallet size={11} /> {inr(item.purchaseCost ?? 0)}{item.uom ? ` / ${item.uom}` : ''}
            </span>
            {band && <ExpiryBandPill css={band.css} label={band.label} />}
          </div>
        </div>
      </div>

      <Section icon={Fingerprint} title="Identity" rows={[
        ['Item code', item.code], ['Category', item.category], ['Manufacturer', item.manufacturer],
        ['Model', item.model], ['Serial no', item.serialNo], ['QR code', item.qrCode], ['Barcode', item.barcode],
      ]} />

      <Section icon={ReceiptIndianRupee} title="Commercial" rows={[
        ['Vendor', item.vendor],
        ['Purchase date', item.purchaseDate],
        ['Purchase cost', item.purchaseCost != null ? inr(item.purchaseCost) : ''],
        ['GST %', item.gst != null ? `${item.gst}%` : ''],
        ['Invoice no', item.invoiceNo],
        ['On hand', item.qtyOnHand != null ? `${item.qtyOnHand} ${item.uom || ''}` : ''],
      ]} />

      {item.itemType === 'Device' && (item.usedForTests?.length ?? 0) > 0 && (
        <>
          <SectionHeader icon={Activity as unknown as IconType}>{`Device → Test mapping (${item.usedForTests!.length})`}</SectionHeader>
          <div className="rounded-xl border p-3 mb-3.5 flex gap-1.5 flex-wrap" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
            {item.usedForTests!.map((tid) => (
              <span key={tid} className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold" style={{ padding: '2px 8px', background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand-700, var(--qms-brand))' }}>
                <Activity size={11} /> {testName(tid)}
              </span>
            ))}
          </div>
        </>
      )}

      {asset && (
        <>
          <Section icon={ShieldCheck} title="Warranty · AMC · Calibration" rows={[
            ['Warranty', item.warrantyYears ? `${item.warrantyYears} yr (till ${item.warrantyEnd || '—'})` : ''],
            ['AMC', item.amcApplicable ? `${inr(item.amcCost ?? 0)} · ${item.amcStart || '?'} → ${item.amcEnd || '?'}` : 'Not applicable'],
            ['Calibration', item.calibApplicable ? `Every ${item.calibFreqDays}d · due ${item.calibDue || '—'}` : 'Not applicable'],
            ['Asset status', item.assetStatus],
          ]} />
          <Section icon={TrendingDown} title="Depreciation · Valuation" rows={[
            ['Useful life', item.usefulLifeYears ? `${item.usefulLifeYears} yr` : ''],
            ['Method', item.deprMethod],
            ['Rate', item.deprPct != null ? `${item.deprPct}%` : ''],
            ['Current value', item.currentValue != null ? inr(item.currentValue) : ''],
          ]} />
        </>
      )}

      {consumable && (
        <Section icon={Box} title="Batch · Expiry · Storage" rows={[
          ['Batch no', item.batchNo],
          ['Mfg date', item.mfgDate],
          ['Expiry date', item.expiryDate],
          ['Remaining', remainingLabel(item.expiryDate)],
          ['Reorder level', item.reorderLevel],
          ['Linked device', item.linkedDeviceId || ''],
          ['Storage', item.storage],
        ]} />
      )}

      <div className="flex gap-2 mt-3.5">
        <Button variant="ghost" onClick={onEdit}><Pencil size={14} /> Edit</Button>
        <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

// section() — exact port: blank/null/undefined rows are dropped entirely,
// and the whole section (heading + card) is omitted if zero rows remain.
const Section = ({ icon, title, rows }: { icon: typeof Cpu; title: string; rows: [string, string | number | null | undefined][] }) => {
  const kept = rows.filter(([, v]) => v !== '' && v != null)
  if (!kept.length) return null
  return (
    <>
      <SectionHeader icon={icon as unknown as IconType}>{title}</SectionHeader>
      <div className="rounded-xl border p-3 mb-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <KeyValueGrid items={kept.map(([label, value]) => ({ label, value }))} />
      </div>
    </>
  )
}

export default ItemMasterTab
