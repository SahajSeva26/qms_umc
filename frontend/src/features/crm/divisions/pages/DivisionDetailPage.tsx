import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi'
import { useDivision } from '@/features/crm/divisions/hooks/useDivision'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import BulkMrImportCard from '@/features/crm/divisions/components/BulkMrImportCard'
import DivisionContactsSection from '@/features/crm/divisions/components/DivisionContactsSection'
import EditDivisionModal from '@/features/crm/divisions/components/EditDivisionModal'
import { Button } from '@/components/ui/button'
import { unwrapId } from '@/utils/unwrapId'

const DivisionDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useDivision(id)
  const division = data?.data ?? null

  // division.tenant may be populated object or a plain id string; resolve both shapes.
  const tenantId = division ? unwrapId(division.tenant, undefined) : undefined

  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="w-full">
      <button
        onClick={() => navigate(tenantId ? TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenantId) : TENANT_ROUTES.TENANTS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to company
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading division…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load division. Please try again.
        </div>
      )}

      {division && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5 flex items-start justify-between gap-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {division.name}
              </div>
              <div className="text-[13px] font-mono truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                {division.code}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {division.therapy.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
                  >
                    {DIVISION_THERAPY_LABEL[t]}
                  </span>
                ))}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${division.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                  style={division.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                >
                  {division.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditOpen(true)}>
              <FiEdit2 size={14} /> Edit division
            </Button>
          </div>

          {tenantId && <BulkMrImportCard tenantId={tenantId} divisionId={division.id} />}

          <div className="mt-5">
            {tenantId && <DivisionContactsSection tenantId={tenantId} divisionId={division.id} />}
          </div>

          {editOpen && <EditDivisionModal division={division} onClose={() => setEditOpen(false)} />}
        </>
      )}
    </div>
  )
}

export default DivisionDetailPage
