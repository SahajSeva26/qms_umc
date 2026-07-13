import type { Camp } from '@/types/camp.types'
import type { CampPerspective } from '@/features/camps/camps.perspective'
import { redactName } from '@/features/camps/camps.perspective'
import { synthesizePatients } from '@/features/camps/camps.patients'
import DossierSection from '@/features/camps/components/DossierSection'
import KeyValueGrid from '@/components/ui/KeyValueGrid'

const RISK_CLASS: Record<string, string> = {
  HIGH: 'bg-danger-soft text-danger',
  BORDERLINE: 'bg-warning-soft text-warning',
  NORMAL: 'bg-success-soft text-success',
}

interface PatientsSectionProps {
  camp: Camp
  perspective: CampPerspective
}

const PatientsSection = ({ camp, perspective }: PatientsSectionProps) => {
  const patients = synthesizePatients(camp)
  const male = patients.filter((p) => p.gender === 'M').length
  const female = patients.filter((p) => p.gender === 'F').length
  const referred = patients.filter((p) => p.referred).length
  const visible = patients.slice(0, 30)

  return (
    <DossierSection title="Patients · results · interpretation">
      <div className="mb-4">
        <KeyValueGrid
          columns={3}
          items={[
            { label: 'Patients screened', value: patients.length },
            { label: 'Gender (M/F)', value: `${male} / ${female}` },
            { label: 'Referred to doctor', value: referred },
          ]}
        />
      </div>

      {perspective === 'pharma' && (
        <p className="text-[11px] mb-3 italic" style={{ color: 'var(--qms-text-muted)' }}>
          Patient identifiers redacted for DPDP compliance.
        </p>
      )}

      {patients.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No patient data captured yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Code', 'Age', 'Gender', 'Patient', 'Tests', 'Risk', 'Interpretation'].map((h) => (
                  <th key={h} className="text-left font-bold text-[10px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.code} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold" style={{ color: 'var(--qms-text)' }}>{p.code}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{p.age}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{p.gender}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{redactName(p.code, perspective)}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{p.tests}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_CLASS[p.risk]}`}>{p.risk}</span>
                    {p.referred && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-soft text-danger">REFERRED</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{p.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length > 30 && (
            <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              +{patients.length - 30} more
            </div>
          )}
        </div>
      )}
    </DossierSection>
  )
}

export default PatientsSection
