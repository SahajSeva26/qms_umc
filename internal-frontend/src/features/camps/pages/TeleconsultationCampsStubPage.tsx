import { FiVideo } from 'react-icons/fi'

// The old mock Camp model had a `teleConsult`/`teleChannel` flag with its own
// locked-tab view over CampsPage. The real backend Camp model
// (backend/src/modules/operations/camp/**) has no teleconsult concept
// anywhere — no field, no status, no endpoint. Kept as a resolvable stub
// (rather than removing the route/nav entry outright) so nothing 404s; if
// teleconsultation becomes a real backend concept later, this is where it'd
// be built for real.
const TeleconsultationCampsStubPage = () => {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
        Teleconsultation Camps
      </h1>
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <FiVideo size={28} className="mx-auto mb-3" style={{ color: 'var(--qms-text-muted)' }} />
        <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
          Not supported by the current backend
        </p>
        <p className="text-[12px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          The real Camp module has no teleconsultation field or status yet. This screen will be
          built once that becomes a real backend concept.
        </p>
      </div>
    </div>
  )
}

export default TeleconsultationCampsStubPage
