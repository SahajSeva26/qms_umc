import type { BrandEntity } from '@/types/brand.types'
import BrandStatusPill from '@/features/crm/brands/components/BrandStatusPill'

interface BrandsTableProps {
  brands: BrandEntity[]
  onOpen: (brand: BrandEntity) => void
}

const BrandsTable = ({ brands, onOpen }: BrandsTableProps) => {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Code
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr
                key={brand.id}
                tabIndex={0}
                role="button"
                onClick={() => onOpen(brand)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(brand) } }}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ borderBottom: '1px solid var(--qms-border)', outlineColor: 'var(--qms-brand)' }}
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {brand.name}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text-muted)' }}>
                  {brand.code}
                </td>
                <td className="px-4 py-2.5">
                  <BrandStatusPill status={brand.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {brands.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No brands found.
        </div>
      )}
    </div>
  )
}

export default BrandsTable
