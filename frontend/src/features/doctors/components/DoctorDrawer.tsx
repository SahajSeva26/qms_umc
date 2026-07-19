import { FiAward, FiTrendingUp, FiMail, FiPhone, FiMapPin, FiExternalLink, FiEdit2, FiMessageCircle, FiSend, FiMap } from 'react-icons/fi'
import type { Doctor, EngagementStats, DoctorPrediction } from '@/features/doctors/doctors.types'
import type { Camp } from '@/types/camp.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import type { ClientMr } from '@/types/client.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/utils/formatters'
import { CHURN_COLOR, initials } from '@/features/doctors/doctors.ui'
import { doctorCompanies, mrsForDoctorCompany } from '@/features/doctors/doctors.service'
import BandPill from '@/features/doctors/components/BandPill'
import type { EngagementBand } from '@/features/doctors/doctors.types'

interface DoctorDrawerProps {
  doctor: Doctor | null
  camps: Camp[]
  stats: EngagementStats
  band: EngagementBand
  score: number
  prediction: DoctorPrediction
  genUIN: (clientId: string, doctorId: string) => string
  onClose: () => void
  onEdit: () => void
  onAddToBroadcast: () => void
}

const DoctorDrawer = ({ doctor, camps, stats, band, score, prediction, genUIN, onClose, onEdit, onAddToBroadcast }: DoctorDrawerProps) => {
  if (!doctor) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = doctor
  const myCamps = [...camps].sort((a, b) => b.date.localeCompare(a.date))
  const history = myCamps.slice(0, 12)

  const clientIds = doctorCompanies(d, camps)

  // Per-company covering MR (for the empanelment table's "MR covering" column)
  // + a de-duped list of every distinct MR across all empanelled companies
  // (for the standalone "MRs covering this doctor" section below).
  const coveringMap = new Map<string, ClientMr>()
  clientIds.forEach((clientId) => {
    const mr = mrsForDoctorCompany(d, clientId)[0]
    if (mr) coveringMap.set(mr.id, mr)
  })
  const coveringMrs = Array.from(coveringMap.values())

  const handleWhatsApp = () => toast.info('WhatsApp opened')
  const handleEmail = () => toast.info('Email composer opened')

  return (
    <SideDrawer open={!!doctor} title={`${d.name}${d.code ? ` · ${d.code}` : ''}`} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
        >
          {initials(d.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.specialty} · {d.city}</div>
          <div className="mt-2"><BandPill band={band} /></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center rounded-lg p-2" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{stats.closedCount}</div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Camps closed</div>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{stats.patients}</div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Avg ★</div>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{score}</div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Engagement score</div>
        </div>
      </div>

      <div className="rounded-xl p-3.5 mb-4" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)' }}>
        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: '#8b5cf6' }}>
          <FiTrendingUp size={13} /> AI prediction
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2 text-[12px]">
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Conversion: </span><span className="font-bold" style={{ color: 'var(--qms-text)' }}>{prediction.conv}%</span></div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Rx uplift: </span><span className="font-bold" style={{ color: 'var(--qms-text)' }}>+{prediction.rxUplift}%</span></div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Best-fit type: </span><span className="font-bold" style={{ color: 'var(--qms-text)' }}>{prediction.bestType}</span></div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--qms-text-muted)' }}>Churn risk:</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${CHURN_COLOR[prediction.churn]}1a`, color: CHURN_COLOR[prediction.churn] }}>
              {prediction.churn}
            </span>
          </div>
        </div>
        <div className="text-[11.5px]" style={{ color: 'var(--qms-text)' }}>
          <span className="font-bold">Next best action: </span>{prediction.nba}
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Contact &amp; address</h3>
      <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={11} /> Email</div><div>{d.email || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={11} /> Phone</div><div>{d.phone || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Specialty</div><div>{d.specialty || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={11} /> City</div><div>{d.city || '—'}, {d.state || '—'} · {d.pincode || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Address</div><div>{d.city ? `${d.city}, ${d.state}` : '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Last camp</div><div>{stats.lastDate ? `${formatDate(stats.lastDate)} (${stats.daysSinceLast}d ago)` : '—'}</div>
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
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiAward size={12} /> Company empanelment &amp; UIN
      </h3>
      {clientIds.length === 0 ? (
        <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>No company empanelment on record.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Company', 'UIN', 'Division', 'MR covering', 'Camps'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientIds.map((clientId) => {
                const client = CLIENTS.find((c) => c.id === clientId)
                const campsForClient = myCamps.filter((c) => c.clientId === clientId)
                const divisionId = campsForClient.find((c) => c.divisionId)?.divisionId
                const division = divisionId ? DIVISIONS.find((dv) => dv.id === divisionId) : undefined
                const mr = mrsForDoctorCompany(d, clientId)[0]
                return (
                  <tr key={clientId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2.5 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{client?.name ?? clientId}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{genUIN(clientId, d.id)}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{division?.name ?? '—'}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>
                      {mr ? (
                        <>
                          {mr.name}
                          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{mr.empCode || ''} · {mr.phone || ''}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{campsForClient.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiMap size={12} /> MRs covering this doctor ({coveringMrs.length})
      </h3>
      {coveringMrs.length === 0 ? (
        <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>No MR mapped yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mb-5">
          {coveringMrs.map((mr) => {
            const client = CLIENTS.find((c) => c.id === mr.clientId)
            return (
              <div key={mr.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ width: 30, height: 30, background: 'var(--qms-brand)' }}>
                  {initials(mr.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {mr.name} <span className="font-normal text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>· {mr.designation || 'MR'}</span>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{client?.name ?? mr.clientId} · {mr.hq || ''} · {mr.phone || ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Camp history ({myCamps.length})</h3>
      {history.length === 0 ? (
        <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden mb-2" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['ID', 'Date', 'Type', 'City', 'Status', 'Patients', '★'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{formatDate(c.date)}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.type}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.city || '—'}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.status}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.patientsDone ?? 0}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.feedback || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {myCamps.length > 12 && (
        <p className="text-[11px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>+{myCamps.length - 12} more</p>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-3">
        {d.phone && <Button variant="outline" onClick={handleWhatsApp}><FiMessageCircle size={13} /> WhatsApp</Button>}
        {d.email && <Button variant="outline" onClick={handleEmail}><FiMail size={13} /> Email</Button>}
        <Button onClick={onEdit}><FiEdit2 size={13} /> Edit</Button>
        <Button variant="outline" onClick={onAddToBroadcast}><FiSend size={13} /> Add to broadcast</Button>
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DoctorDrawer
