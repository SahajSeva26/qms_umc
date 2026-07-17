import type { Camp } from '@/types/camp.types'
import { getDoctor } from '@/features/camps/camps.utils'
import { clientName, divisionName, foName } from '@/features/camps/camps.refs'
import CampStatusPill from '@/features/camps/components/CampStatusPill'
import { formatDate } from '@/utils/formatters'

const COLUMNS = ['ID', 'Date', 'Slot', 'Type', 'Client', 'Division', 'Project', 'Doctor', 'City', 'FO', 'Patients', 'Status']

interface CampTableProps {
  camps: Camp[]
  onOpen: (id: string) => void
}

const CampTable = ({ camps, onOpen }: CampTableProps) => (
  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--qms-border)' }}>
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
          {COLUMNS.map((h) => (
            <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {camps.map((camp) => {
          const doctor = getDoctor(camp.doctorId)
          const fo = foName(camp.foId)
          return (
            <tr
              key={camp.id}
              onClick={() => onOpen(camp.id)}
              className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderBottom: '1px solid var(--qms-border)' }}
            >
              <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{camp.id}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(camp.date)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{camp.slot}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{camp.type}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{clientName(camp.clientId)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{divisionName(camp.divisionId)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{camp.projectId ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{doctor?.name ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{camp.city}, {camp.state}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {fo ? (
                  <span style={{ color: 'var(--qms-text)' }}>{fo}</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">UNASSIGNED</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{camp.patientsDone}/{camp.patientsExpected}</td>
              <td className="px-3 py-2 whitespace-nowrap"><CampStatusPill status={camp.status} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
    {camps.length === 0 && (
      <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
        No camps found.
      </div>
    )}
  </div>
)

export default CampTable
