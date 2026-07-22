import { useMemo, useState } from 'react'
import { FiUpload, FiDownload, FiZap, FiShield, FiSearch, FiClipboard, FiSun, FiMap, FiMapPin, FiDatabase, FiUsers, FiList, FiFileText, FiActivity } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampsData } from '@/hooks/useCampsData'
import { useHqMaster } from '@/features/hq/hooks/useHq'
import { activeFos, classifyAll, getConfig } from '@/features/hq/hq.service'
import { toast } from '@/components/ui/sonner'
import HqFilterBar from '@/features/hq/components/hqmapping/HqFilterBar'
import { EMPTY_HQ_FILTERS, applyHqFilters, uniqSorted } from '@/features/hq/components/hqmapping/hqFilters'
import { HQ_TABS, defaultHqTab, type HqTabId } from '@/features/hq/components/hqmapping/hq.ui'
import { downloadCsv, todayIso } from '@/features/hq/components/hqmapping/hq.ui'
import { buildReportRows } from '@/features/hq/components/hqmapping/hqReports'
import HqDrawer from '@/features/hq/components/hqmapping/HqDrawer'
import AdminTab from '@/features/hq/components/hqmapping/tabs/AdminTab'
import SalesTab from '@/features/hq/components/hqmapping/tabs/SalesTab'
import OpsTab from '@/features/hq/components/hqmapping/tabs/OpsTab'
import CoordTab from '@/features/hq/components/hqmapping/tabs/CoordTab'
import MapTab from '@/features/hq/components/hqmapping/tabs/MapTab'
import MappingTab from '@/features/hq/components/hqmapping/tabs/MappingTab'
import HqMasterTab from '@/features/hq/components/hqmapping/tabs/HqMasterTab'
import FoMasterTab from '@/features/hq/components/hqmapping/tabs/FoMasterTab'
import BulkCheckTab from '@/features/hq/components/hqmapping/tabs/BulkCheckTab'
import ReportsTab from '@/features/hq/components/hqmapping/tabs/ReportsTab'
import AiTab from '@/features/hq/components/hqmapping/tabs/AiTab'
import { MRS } from '@/types/client.types'
import { PROJECTS } from '@/features/crm/clients/clients.mock'

const TAB_ICON: Record<HqTabId, typeof FiShield> = {
  admin: FiShield, sales: FiSearch, ops: FiClipboard, coord: FiSun, map: FiMap,
  mapping: FiMapPin, hq: FiDatabase, fo: FiUsers, bulk: FiList, reports: FiFileText, ai: FiZap,
}

// HQ Mapping & Serviceability — exact port of hq-serviceability.js's
// render()/renderTabs()/renderHeadMeta()/bindToolbar() (lines 543-618,
// 1968-1988) merged with hq-mapping.js's own drill-down (the 'mapping' tab
// delegates straight to MappingTab, mirroring the prototype's own
// STATE.tab==='mapping' branch that re-mounts #hqmap-root and calls
// QMS_initHqMapping() unchanged). Filters/classifyAll() drive every other tab.
const HqPage = () => {
  const { user } = useAuth()
  const role = user?.role

  const { people, devices } = usePeopleData()
  const { camps, patchCamp } = useCampsData()
  const { hqs: _hqs, isLoading: hqsLoading, refetch: refetchHqs } = useHqMaster()

  const [filters, setFilters] = useState(EMPTY_HQ_FILTERS)
  const [openHqId, setOpenHqId] = useState<string | null>(null)

  const showableTabs = useMemo(() => HQ_TABS.filter((t) => t.show(role)), [role])
  const [tab, setTabRaw] = useState<HqTabId>(() => defaultHqTab(role))
  const activeTab = showableTabs.some((t) => t.id === tab) ? tab : (showableTabs[0]?.id ?? 'admin')
  const setTab = (id: HqTabId) => setTabRaw(id)

  const fos = useMemo(() => activeFos(people, camps, devices), [people, camps, devices])
  const allRows = useMemo(() => classifyAll(people, camps, devices), [people, camps, devices])
  const filteredRows = useMemo(() => applyHqFilters(allRows, filters), [allRows, filters])
  const cfg = getConfig()

  const companies = useMemo(() => uniqSorted(allRows.map((r) => r.company)), [allRows])
  const states = useMemo(() => uniqSorted(allRows.map((r) => r.state)), [allRows])
  const cities = useMemo(() => uniqSorted(allRows.map((r) => r.city)), [allRows])
  const divisions = useMemo(() => uniqSorted(allRows.map((r) => r.division)), [allRows])
  const deviceTypes = useMemo(() => uniqSorted(allRows.map((r) => r.requiredDevice)), [allRows])

  const openHq = allRows.find((r) => r.id === openHqId) ?? null

  const green = allRows.filter((r) => r.status === 'GREEN').length
  const coveragePct = allRows.length ? Math.round((green / allRows.length) * 100) : 0
  const coverageColor = coveragePct >= 80 ? '#047857' : coveragePct >= 50 ? '#92400e' : '#b91c1c'

  const handleAssignFo = (campId: string, foId: string) => {
    const fo = people.find((p) => p.id === foId)
    if (!fo) { toast.error('FO not found'); return }
    patchCamp(campId, { foId: fo.id, foName: fo.name })
      .then(() => toast.success(`Assigned ${fo.name} to ${campId}`))
      .catch(() => toast.error('Could not assign FO'))
  }

  const exportCoverage = () => {
    const data = buildReportRows('coverage', allRows, fos, devices)
    if (!data.length) { toast.info('No data'); return }
    downloadCsv(`hq-coverage-${todayIso()}.csv`, data)
    toast.success('Exported hq-coverage (csv)')
  }

  return (
    <div className="max-w-[1600px]">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Territory</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>HQ Mapping &amp; Serviceability</h1>
          <div className="text-xs mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Auto serviceability engine · {cfg.radiusKm} KM radius · nearest FO + device matching · territory analytics
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Coverage</div>
          <div className="text-lg font-extrabold" style={{ color: coverageColor }}>{coveragePct}%</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{green.toLocaleString()} of {allRows.length.toLocaleString()} serviceable</div>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap mb-3">
        <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          {showableTabs.map((t) => {
            const Icon = TAB_ICON[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap shrink-0 transition-colors"
                style={{
                  background: activeTab === t.id ? 'var(--qms-surface-card, #fff)' : 'transparent',
                  color: activeTab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                  boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                }}
              >
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => toast.info('Import master data — wiring comes next pass')}
            className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--qms-border)' }}
          >
            <FiUpload size={13} /> Import Excel
          </button>
          <button onClick={exportCoverage} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
            <FiDownload size={13} /> Export
          </button>
          <button
            onClick={() => { refetchHqs(); toast.success('Recomputed serviceability') }}
            className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiZap size={13} /> Recompute
          </button>
        </div>
      </div>

      {hqsLoading ? (
        <div className="flex items-center gap-2 py-10 justify-center" style={{ color: 'var(--qms-text-muted)' }}>
          <FiActivity className="animate-spin" size={16} /> Loading HQ master…
        </div>
      ) : (
        <>
          {activeTab !== 'mapping' && (
            <HqFilterBar filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} companies={companies} states={states} cities={cities} divisions={divisions} deviceTypes={deviceTypes} />
          )}

          {activeTab === 'admin' && <AdminTab rows={filteredRows} fos={fos} devices={devices} mrs={MRS} projects={PROJECTS} deviceLoadPct={cfg.deviceLoadPct} onOpenRow={setOpenHqId} />}
          {activeTab === 'sales' && <SalesTab rows={filteredRows} fos={fos} onOpenRow={setOpenHqId} />}
          {activeTab === 'ops' && <OpsTab rows={filteredRows} fos={fos} devices={devices} deviceLoadPct={cfg.deviceLoadPct} />}
          {activeTab === 'coord' && <CoordTab rows={filteredRows} fos={fos} camps={camps} onOpenRow={setOpenHqId} onAssignFo={handleAssignFo} />}
          {activeTab === 'map' && <MapTab rows={filteredRows} fos={fos} radiusKm={cfg.radiusKm} onOpenHq={setOpenHqId} />}
          {activeTab === 'mapping' && <MappingTab fos={fos} camps={camps} radiusKm={cfg.radiusKm} />}
          {activeTab === 'hq' && <HqMasterTab rows={filteredRows} allCount={allRows.length} onOpenRow={setOpenHqId} onClearUploaded={() => toast.info('Clearing uploaded HQ rows — wiring comes next pass')} />}
          {activeTab === 'fo' && <FoMasterTab fos={fos} />}
          {activeTab === 'bulk' && <BulkCheckTab fos={fos} />}
          {activeTab === 'reports' && <ReportsTab rows={allRows} fos={fos} devices={devices} />}
          {activeTab === 'ai' && <AiTab rows={allRows} fos={fos} />}
        </>
      )}

      <HqDrawer
        hq={openHq}
        onClose={() => setOpenHqId(null)}
        onAssign={(hq) => {
          const candidate = camps.find((c) => c.city?.toLowerCase() === hq.city.toLowerCase() && !c.foId && !String(c.status || '').startsWith('CANCEL'))
          if (!candidate) { toast.info(`No open camps in ${hq.city} to book against`); return }
          if (hq.nearestFo) handleAssignFo(candidate.id, hq.nearestFo.id)
          setOpenHqId(null)
        }}
        onExportCoverage={exportCoverage}
      />
    </div>
  )
}

export default HqPage
