import { FiZap } from 'react-icons/fi'
import { AI_RECOMMENDATIONS, ROI_ESTIMATE } from '@/features/crm/crm.insights'

const AiRecommendationsTab = () => (
  <div className="space-y-4">
    <div
      className="flex items-start gap-2.5 rounded-xl p-3"
      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,.08), rgba(36,81,240,.06))', border: '1px solid var(--qms-border)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, var(--qms-brand))' }}
      >
        <FiZap size={14} />
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
        <span className="font-bold" style={{ color: 'var(--qms-text)' }}>AI Solution Recommender</span> — based on
        assessment + comparable accounts.
      </p>
    </div>

    <div className="space-y-2">
      {AI_RECOMMENDATIONS.map((rec) => (
        <div key={rec.service} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{rec.service}</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{rec.estimate}</div>
          </div>
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
            <div className="h-full rounded-full" style={{ width: `${rec.confidence}%`, background: 'linear-gradient(90deg, var(--qms-brand), var(--qms-teal))' }} />
          </div>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{rec.confidence}%</span>
        </div>
      ))}
    </div>

    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Estimated ROI
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Rx uplift', value: ROI_ESTIMATE.rxUplift },
          { label: 'Patient reach', value: ROI_ESTIMATE.patientReach },
          { label: 'Payback', value: ROI_ESTIMATE.payback },
          { label: 'Confidence', value: ROI_ESTIMATE.confidence },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
            <div className="text-sm font-extrabold" style={{ color: 'var(--qms-text)' }}>{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default AiRecommendationsTab
