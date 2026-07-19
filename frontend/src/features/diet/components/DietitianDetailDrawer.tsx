import { FiPhone, FiMapPin, FiCheckCircle, FiEdit2, FiMessageCircle, FiCpu, FiExternalLink } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Dietitian } from '@/features/diet/diet.types'
import { dietStage } from '@/features/diet/diet.utils'
import DietStatusPill from '@/features/diet/components/DietStatusPill'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { usePeopleData } from '@/hooks/usePeopleData'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/utils/formatters'

interface DietitianDetailDrawerProps {
  open: boolean
  onClose: () => void
  dietitian: Dietitian | null
  camps?: Camp[]
  onOpenCamp?: (campId: string) => void
  onEdit?: () => void
}

function initials(name: string) {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}
function stringToColor(s: string) {
  const palette = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}
function inr(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

// Mirrors window.dcOpenDietitian exactly (diet-camps.js:2129-2205) — contact
// block, commercials-per-camp with bold computed total, machines-assigned
// chips (resolved against the device catalog), camp history (last 12,
// clickable rows), Edit + WhatsApp (decorative stub) actions.
const DietitianDetailDrawer = ({ open, onClose, dietitian, camps = [], onOpenCamp, onEdit }: DietitianDetailDrawerProps) => {
  const { devices } = usePeopleData()

  if (!dietitian) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = dietitian
  const total = (d.remuneration || 0) + (d.ta || 0) + (d.da || 0) + (d.printing || 0)
  const myCamps = camps.filter((c) => c.dietitianId === d.id)
  const history = myCamps.slice(0, 12)

  const handleWhatsApp = () => {
    toast.info('WhatsApp opened')
  }

  return (
    <SideDrawer open={open} title={`${d.name}${d.code ? ` · ${d.code}` : ''}`} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="w-15 h-15 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 60, height: 60, background: `linear-gradient(135deg, ${stringToColor(d.name)}, #14b8a6)` }}
        >
          {initials(d.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.qualification || '—'}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: d.interviewed ? 'var(--success-soft)' : 'var(--warning-soft)', color: d.interviewed ? 'var(--success)' : 'var(--warning)' }}
            >
              {d.interviewed ? 'INTERVIEWED' : 'PENDING IV'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiMapPin size={11} /> {d.city || '—'}, {d.state || '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiCheckCircle size={11} /> {d.status || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiPhone size={12} /> Contact
      </h3>
      <div className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div style={{ color: 'var(--qms-text-muted)' }}>Email</div><div>{d.email || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Phone</div><div>{d.phone || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Address</div><div>{d.address || '—'}</div>
        {d.gmap && (
          <>
            <div style={{ color: 'var(--qms-text-muted)' }}>Map</div>
            <div>
              <a href={d.gmap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--qms-brand)' }}>
                Open Google Maps <FiExternalLink size={11} />
              </a>
            </div>
          </>
        )}
        {d.resumeUrl && (
          <>
            <div style={{ color: 'var(--qms-text-muted)' }}>Resume</div>
            <div>
              <a href={d.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--qms-brand)' }}>
                Open resume <FiExternalLink size={11} />
              </a>
            </div>
          </>
        )}
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Commercials per camp</h3>
      <div className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div style={{ color: 'var(--qms-text-muted)' }}>Remuneration</div><div>{inr(d.remuneration || 0)}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>TA</div><div>{inr(d.ta || 0)}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>DA</div><div>{inr(d.da || 0)}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Printing</div><div>{inr(d.printing || 0)}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Total / camp</div>
        <div className="font-extrabold" style={{ color: 'var(--success)' }}>{inr(total)}</div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiCpu size={12} /> Machines assigned
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(d.machinesAssigned || []).length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>None assigned.</p>
        )}
        {(d.machinesAssigned || []).map((id) => {
          const dev = devices.find((x) => x.id === id)
          return (
            <span key={id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiCpu size={11} /> {dev?.category || id}
            </span>
          )
        })}
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Camp history ({myCamps.length})</h3>
      {history.length === 0 ? (
        <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['ID', 'Date', 'City', 'Stage'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpenCamp?.(c.id)}
                  className="border-t cursor-pointer"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <td className="px-2.5 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{formatDate(c.date)}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.city || '—'}</td>
                  <td className="px-2.5 py-2"><DietStatusPill stage={dietStage(c)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => onEdit?.()}><FiEdit2 size={13} /> Edit</Button>
        {d.phone && (
          <Button variant="outline" onClick={handleWhatsApp}><FiMessageCircle size={13} /> WhatsApp</Button>
        )}
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DietitianDetailDrawer
