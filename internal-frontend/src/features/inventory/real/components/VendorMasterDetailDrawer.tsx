import { Fragment } from 'react'
import { FiEdit2, FiInfo, FiHash, FiUsers, FiMapPin } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import CopyButton from '@/components/ui/CopyButton'
import { Button } from '@/components/ui/button'
import type { VendorMasterEntity } from '@/types/vendorMaster.types'

interface KvRow { label: string; value: string | number | undefined | null }

const SectionCard = ({ title, icon: Icon, rows }: { title: string; icon: typeof FiInfo; rows: KvRow[] }) => {
  const visible = rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
  if (visible.length === 0) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white" style={{ background: 'var(--qms-brand)' }}>
          <Icon size={12} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{title}</p>
      </div>
      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
          {visible.map((r) => (
            <Fragment key={r.label}>
              <div style={{ color: 'var(--qms-text-muted)' }}>{r.label}</div>
              <div style={{ color: 'var(--qms-text)' }}>{r.value}</div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

interface VendorMasterDetailDrawerProps {
  vendor: VendorMasterEntity
  canManage: boolean
  onClose: () => void
  onEdit: () => void
}

// Matches the prototype's vendor drawer structure — Registration section lists only real fields
// (code, contacts, address). The scorecard/price-history sections need models we don't have (see ui-revisions.md).
const VendorMasterDetailDrawer = ({ vendor, canManage, onClose, onEdit }: VendorMasterDetailDrawerProps) => {
  const primaryContact = vendor.contacts[0]
  const address = vendor.address

  return (
    <SideDrawer open title={vendor.name} onClose={onClose} widthClassName="max-w-[940px]">
      <div className="flex items-start gap-3.5 mb-5">
        <div
          className="w-15 h-15 rounded-2xl flex items-center justify-center text-white font-extrabold text-[20px] shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {vendor.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{vendor.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {address?.city ? `Vendor · ${address.city}` : 'Vendor'}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiHash size={11} />
              <span className="font-mono">{vendor.code}</span>
              <CopyButton value={vendor.code} label="Code" />
            </span>
            {vendor.status && (
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${vendor.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                style={vendor.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
              >
                {vendor.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <SectionCard
        title="Registration"
        icon={FiInfo}
        rows={[
          { label: 'Vendor code', value: vendor.code },
          { label: 'Primary contact', value: primaryContact?.name },
          { label: 'Designation', value: primaryContact?.designation },
          { label: 'Phone', value: primaryContact?.number },
          { label: 'Email', value: primaryContact?.email },
        ]}
      />

      {vendor.contacts.length > 1 && (
        <SectionCard
          title={`Other contacts (${vendor.contacts.length - 1})`}
          icon={FiUsers}
          rows={vendor.contacts.slice(1).map((c) => ({
            label: c.designation || 'Contact',
            value: [c.name, c.number, c.email].filter(Boolean).join(' · '),
          }))}
        />
      )}

      {address && (
        <SectionCard
          title="Address"
          icon={FiMapPin}
          rows={[
            { label: 'Address', value: [address.addressLine1, address.addressLine2].filter(Boolean).join(', ') },
            { label: 'Locality', value: address.locality },
            { label: 'City', value: address.city },
            { label: 'State', value: address.state },
            { label: 'Pincode', value: address.pincode },
            { label: 'Country', value: address.country },
          ]}
        />
      )}

      <p className="text-[11px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>
        Created {new Date(vendor.createdAt).toLocaleDateString()} · Updated {new Date(vendor.updatedAt).toLocaleDateString()}
      </p>

      <div className="flex gap-2">
        {canManage && (
          <Button onClick={onEdit} className="text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiEdit2 size={14} /> Edit
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className={canManage ? 'ml-auto' : ''}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default VendorMasterDetailDrawer
