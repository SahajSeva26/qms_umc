import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLayers, FiUserCheck, FiCpu, FiRefreshCw, FiUserPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { campStatus, rankDietitiansForCamp } from '@/features/om/om.service'
import { clientName } from '@/types/campref.types'
import { formatDate } from '@/utils/formatters'

interface AssignmentsTabProps {
  camps: Camp[]
  mode: 'Screening' | 'Diet'
  fos: Person[]
  dietitians: Person[]
  devices: DeviceCatalogItem[]
  onAssignFo: (campId: string, foId: string) => void
  onAssignDevices: (campId: string, deviceIds: string[]) => void
  onProposeDietitian: (campId: string, dietitianId: string, reasons: string[], score: number) => void
}

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#94a3b8', UPCOMING: '#3b6dff', ONGOING: '#10b981', COMPLETED: '#14b8a6', OVERDUE: '#f43f5e', CANCELLED: '#f59e0b', CANCELLED_CHARGED: '#f43f5e',
}

// Mirrors tabAssign() exactly (om-portal.js:1058-1243). Screening: direct FO +
// device assignment. Diet: OM can only PROPOSE a dietitian — the Diet Camp
// Coordinator's own assignDietitianByCoord (outside OM's scope) commits the
// assignment, so a Diet camp's subject cell has 4 distinct states (assigned·
// coord-approved / pending coord / proposal rejected / unassigned), each with
// a different action, not a single Assign button.
const AssignmentsTab = ({ camps, mode, fos, dietitians, devices, onAssignFo, onAssignDevices, onProposeDietitian }: AssignmentsTabProps) => {
  const navigate = useNavigate()
  const isDiet = mode === 'Diet'
  const subjCol = isDiet ? 'Dietitian' : 'FO'

  const [foModalCamp, setFoModalCamp] = useState<Camp | null>(null)
  const [deviceModalCamp, setDeviceModalCamp] = useState<Camp | null>(null)
  const [proposeModalCamp, setProposeModalCamp] = useState<Camp | null>(null)
  const [selectedFo, setSelectedFo] = useState('')
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectedDietitian, setSelectedDietitian] = useState('')

  const openCamps = camps
    .filter((c) => c.type === mode && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED' && c.status !== 'CLOSED')
    .sort((a, b) => a.date.localeCompare(b.date))

  const unassignedCount = openCamps.filter((c) => !(isDiet ? c.dietitianId : c.foId)).length
  const noDevicesCount = openCamps.filter((c) => c.devicesAllocated.length === 0).length

  const closedDietCamps = camps.filter((c) => c.type === 'Diet' && c.status === 'CLOSED')
  const rankedFor = (camp: Camp) => (isDiet ? rankDietitiansForCamp(camp, dietitians, closedDietCamps) : [])

  const foName = (id?: string) => fos.find((f) => f.id === id)?.name ?? id
  const dietitianName = (id?: string) => dietitians.find((d) => d.id === id)?.name ?? id

  return (
    <div>
      <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{isDiet ? 'Dietitian assignment' : 'Camp & device assignment'}</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          {openCamps.length} open {mode} camps · {unassignedCount} need a {subjCol}{!isDiet ? ` · ${noDevicesCount} need devices` : ''}
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Camp · Date', 'Company', 'City', subjCol, 'Devices', 'Status', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {openCamps.map((c) => {
              const status = campStatus(c)
              const devCount = c.devicesAllocated.length
              const subjId = isDiet ? c.dietitianId : c.foId
              const prop = isDiet ? c.dietitianProposal : undefined

              return (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5">
                    <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{c.id}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)} · {c.slot}</div>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(c.clientId)}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{c.city || '—'}</td>

                  {/* Subject cell */}
                  <td className="px-3 py-2.5">
                    {!isDiet ? (
                      subjId ? <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{foName(subjId)}</span>
                        : <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>UNASSIGNED</span>
                    ) : subjId ? (
                      <>
                        <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{dietitianName(subjId)}</span>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>assigned · Diet Coord approved</div>
                      </>
                    ) : prop?.status === 'SUGGESTED' || prop?.status === 'PENDING' ? (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,.14)', color: '#92400e' }}>Pending Diet Coord</span>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{prop.suggestedDietitianName}</div>
                      </>
                    ) : prop?.status === 'REJECTED' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,.14)', color: '#b91c1c' }}>Proposal rejected</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>UNASSIGNED</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {devCount ? `${devCount} device${devCount === 1 ? '' : 's'}` : !isDiet ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>NO DEVICES</span>
                    ) : ''}
                  </td>

                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status] }}>{status}</span>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex justify-end items-center gap-1.5 whitespace-nowrap">
                      {!isDiet ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setFoModalCamp(c); setSelectedFo(c.foId ?? '') }}>
                            <FiUserCheck size={12} /> {c.foId ? 'Reassign' : 'Assign'} FO
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDeviceModalCamp(c); setSelectedDevices(c.devicesAllocated) }}>
                            <FiCpu size={12} /> Devices
                          </Button>
                        </>
                      ) : subjId ? (
                        <Button size="sm" variant="ghost" onClick={() => { setProposeModalCamp(c); setSelectedDietitian(rankedFor(c)[0]?.dietitianId ?? '') }}>
                          <FiUserCheck size={12} /> Re-propose
                        </Button>
                      ) : prop?.status === 'SUGGESTED' || prop?.status === 'PENDING' ? (
                        <Button size="sm" variant="ghost" onClick={() => { setProposeModalCamp(c); setSelectedDietitian(rankedFor(c)[0]?.dietitianId ?? '') }}>
                          <FiRefreshCw size={12} /> Re-propose
                        </Button>
                      ) : prop?.status === 'REJECTED' ? (
                        <Button size="sm" onClick={() => { setProposeModalCamp(c); setSelectedDietitian(rankedFor(c)[0]?.dietitianId ?? '') }}>
                          <FiUserPlus size={12} /> Propose again
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => { setProposeModalCamp(c); setSelectedDietitian(rankedFor(c)[0]?.dietitianId ?? '') }}>
                          <FiUserPlus size={12} /> Propose Dietitian
                        </Button>
                      )}
                      <button onClick={() => navigate(`/camps/${c.id}`)} title="Open full camp dossier" style={{ color: 'var(--qms-brand)' }}>
                        <FiLayers size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {openCamps.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No open camps to assign</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign FO (Screening) */}
      <Dialog open={!!foModalCamp} onOpenChange={(o) => !o && setFoModalCamp(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Assign FO — {foModalCamp?.id}</DialogTitle></DialogHeader>
          {foModalCamp && <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>{clientName(foModalCamp.clientId)} · {foModalCamp.city}</p>}
          <Select value={selectedFo} onValueChange={(v) => setSelectedFo(v ?? '')}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="— Select FO —" /></SelectTrigger>
            <SelectContent>{fos.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}{f.hq ? ` · ${f.hq}` : ''}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFoModalCamp(null)}>Cancel</Button>
            <Button disabled={!selectedFo} onClick={() => { if (foModalCamp) onAssignFo(foModalCamp.id, selectedFo); setFoModalCamp(null) }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate devices */}
      <Dialog open={!!deviceModalCamp} onOpenChange={(o) => !o && setDeviceModalCamp(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Allocate devices — {deviceModalCamp?.id}</DialogTitle></DialogHeader>
          <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>Tick the devices for this camp</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {devices.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-[12px] px-2.5 py-2 rounded-lg border cursor-pointer" style={{ borderColor: 'var(--qms-border)' }}>
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(d.id)}
                  onChange={(e) => setSelectedDevices((prev) => e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id))}
                />
                <div className="min-w-0">
                  <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.category} · {d.unitsAvailable} available</div>
                </div>
              </label>
            ))}
            {devices.length === 0 && <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No device catalog loaded</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceModalCamp(null)}>Cancel</Button>
            <Button onClick={() => { if (deviceModalCamp) onAssignDevices(deviceModalCamp.id, selectedDevices); setDeviceModalCamp(null) }}>Save allocation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose dietitian (Diet) */}
      <Dialog open={!!proposeModalCamp} onOpenChange={(o) => !o && setProposeModalCamp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Propose dietitian — {proposeModalCamp?.id}</DialogTitle></DialogHeader>
          {proposeModalCamp && (
            <div className="space-y-2.5">
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(proposeModalCamp.clientId)} · {proposeModalCamp.city}</p>
              {rankedFor(proposeModalCamp)[0] && (
                <div className="rounded-lg p-2.5 border border-dashed" style={{ background: 'rgba(124,92,255,.06)', borderColor: 'rgba(124,92,255,.3)' }}>
                  <div className="text-[12px] font-extrabold mb-1" style={{ color: 'var(--qms-text)' }}>
                    ✨ Auto-suggested: {dietitianName(rankedFor(proposeModalCamp)[0].dietitianId)}
                  </div>
                  <ul className="list-disc list-inside text-[11px]" style={{ color: 'var(--qms-text-soft)' }}>
                    {rankedFor(proposeModalCamp)[0].reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                Pick a dietitian — you&apos;ll capture their <strong>Remuneration · TA · Printing</strong> next. The Diet Camp Coordinator sees those rates and reviews them before finalising the assignment.
              </p>
              <Select value={selectedDietitian} onValueChange={(v) => setSelectedDietitian(v ?? '')}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select dietitian" /></SelectTrigger>
                <SelectContent>
                  {rankedFor(proposeModalCamp).map((r) => (
                    <SelectItem key={r.dietitianId} value={r.dietitianId}>{dietitianName(r.dietitianId)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeModalCamp(null)}>Cancel</Button>
            <Button
              disabled={!selectedDietitian}
              onClick={() => {
                if (proposeModalCamp) {
                  const ranked = rankedFor(proposeModalCamp).find((r) => r.dietitianId === selectedDietitian)
                  onProposeDietitian(proposeModalCamp.id, selectedDietitian, ranked?.reasons ?? [], ranked?.score ?? 0)
                }
                setProposeModalCamp(null)
              }}
            >
              Next · capture rates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AssignmentsTab
