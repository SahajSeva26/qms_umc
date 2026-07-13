export interface CmKpiTileItem {
  label: string
  value: string | number
  sub?: string
}

interface CmKpiTilesProps {
  tiles: CmKpiTileItem[]
}

const CmKpiTiles = ({ tiles }: CmKpiTilesProps) => (
  <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
    {tiles.map((tile) => (
      <div
        key={tile.label}
        className="rounded-xl border p-3"
        style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          {tile.label}
        </div>
        <div className="text-[20px] font-extrabold tracking-tight" style={{ color: 'var(--qms-text)' }}>
          {tile.value}
        </div>
        {tile.sub && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</div>
        )}
      </div>
    ))}
  </div>
)

export default CmKpiTiles
