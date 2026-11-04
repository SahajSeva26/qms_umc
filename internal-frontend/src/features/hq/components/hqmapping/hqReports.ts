// Report-runner data builders — exact port of hq-serviceability.js's
// window.hqRunReport() (lines 1772-1848), split into 6 pure row-builders so
// the Reports tab can wire CSV / Excel-as-CSV / PDF (print) actions to the
// same underlying data per report id.
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import type { DeviceCatalogItem } from '@/types/device.types'

export type HqReportId = 'coverage' | 'state' | 'fo-util' | 'device-util' | 'gap' | 'nearest'

export const HQ_REPORT_DEFS: { id: HqReportId; name: string; desc: string }[] = [
  { id: 'coverage', name: 'HQ coverage report', desc: 'All HQs · status · nearest FO · distance · ETA' },
  { id: 'state', name: 'State-wise serviceability', desc: 'Per state · counts by status · coverage %' },
  { id: 'fo-util', name: 'FO utilization report', desc: 'Per FO · daily camps · load % · device mix' },
  { id: 'device-util', name: 'Device utilization report', desc: 'Per device · faulty · calibration' },
  { id: 'gap', name: 'Gap analysis report', desc: 'RED HQ list by state · cluster recommendations' },
  { id: 'nearest', name: 'Nearest FO mapping report', desc: 'HQ → nearest FO + 2nd nearest · for territory desk' },
]

export function buildReportRows(
  id: HqReportId,
  rows: ClassifiedHq[],
  fos: GeoFo[],
  devices: DeviceCatalogItem[]
): Record<string, unknown>[] {
  if (id === 'coverage') {
    return rows.map((r) => ({
      HQ_Name: r.hqName, HQ_Code: r.hqCode, Pharma: r.company, Division: r.division,
      City: r.city, State: r.state, Status: r.status,
      Required_Device: r.requiredDevice || '',
      Nearest_FO: r.nearestFo?.name || '',
      FO_City: r.nearestFo?.hq || '',
      Distance_KM: r.distanceKm == null ? '' : r.distanceKm.toFixed(2),
      ETA_Min: r.etaMin == null ? '' : r.etaMin,
      FO_Load_Pct: r.deviceLoadPct,
      Last_Updated: r.lastUpdated,
    }))
  }
  if (id === 'state') {
    const byState: Record<string, { total: number; green: number; yellow: number; orange: number; red: number }> = {}
    rows.forEach((r) => {
      const s = r.state || '—'
      if (!byState[s]) byState[s] = { total: 0, green: 0, yellow: 0, orange: 0, red: 0 }
      byState[s].total++
      byState[s][r.status.toLowerCase() as 'green' | 'yellow' | 'orange' | 'red']++
    })
    return Object.entries(byState)
      .map(([s, b]) => ({
        State: s, Total_HQs: b.total, Green: b.green, Yellow: b.yellow, Orange: b.orange, Red: b.red,
        Coverage_Pct: b.total ? Math.round((b.green / b.total) * 100) : 0,
      }))
      .sort((a, b) => b.Total_HQs - a.Total_HQs)
  }
  if (id === 'fo-util') {
    return fos.map((f) => ({
      FO_ID: f.id, FO: f.name, HQ_City: f.hq, State: f.state,
      Devices: f.deviceTypes.join('; '),
      Daily_Cap: f.dailyCap, Load_Today: f.loadToday, Load_Pct: f.loadPct,
      Lat: f.lat, Lng: f.lng,
    }))
  }
  if (id === 'device-util') {
    return devices.map((d) => ({
      Device_ID: d.id, Device_Name: d.name || '', Type: d.type || '', Status: d.status || '',
      Assigned_FO: d.assignedFoId || '', Faulty: d.faulty ? 'YES' : 'NO',
      Next_Calibration: d.nextCalibration || '', Backup: d.backupDevice || '',
    }))
  }
  if (id === 'gap') {
    return rows.filter((r) => r.status === 'RED' || r.status === 'ORANGE').map((r) => ({
      HQ: r.hqName, City: r.city, State: r.state, Pharma: r.company,
      Status: r.status, Reason: r.reason,
      Nearest_FO: r.nearestFo?.name || '',
      Distance_KM: r.distanceKm == null ? '' : r.distanceKm.toFixed(2),
      Priority: r.priority, Business: r.businessPotential,
    }))
  }
  // nearest
  return rows.map((r) => ({
    HQ: r.hqName, City: r.city, State: r.state,
    Nearest_FO: r.nearestFo?.name || '', Distance_KM_1: r.distanceKm == null ? '' : r.distanceKm.toFixed(2),
    Second_FO: r.secondFo?.name || '', Distance_KM_2: r.secondFo ? r.secondFo.km.toFixed(2) : '',
  }))
}
