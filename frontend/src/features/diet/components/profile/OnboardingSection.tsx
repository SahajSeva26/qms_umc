import { useState } from 'react'
import { FiBriefcase, FiCheck, FiX, FiCreditCard, FiFileText, FiCpu, FiSend } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import type { DietitianProfileBundle, DietitianEnrollStatus } from '@/features/diet/dietitians.types'
import { dietitianOnboardingComplete, submitDietitianForInterview } from '@/features/diet/dietitians.service'
import { fmtDate } from './profile.utils'
import BankAddDialog from './BankAddDialog'
import ResumeUploadDialog from './ResumeUploadDialog'
import DeviceAlignmentDialog from './DeviceAlignmentDialog'

interface OnboardingSectionProps {
  bundle: DietitianProfileBundle
  onChanged: () => void
}

const STATUS_META: Record<DietitianEnrollStatus, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: 'rgba(245,158,11,.16)', color: '#92400e', label: 'PENDING · onboarding incomplete' },
  SUBMITTED: { bg: 'rgba(59,109,255,.14)', color: '#1d4ed8', label: 'SUBMITTED · awaiting OM·Diet interview' },
  APPROVED:  { bg: 'rgba(16,185,129,.16)', color: '#047857', label: 'APPROVED · OM·Diet cleared' },
  REJECTED:  { bg: 'rgba(244,63,94,.16)',  color: '#b91c1c', label: 'REJECTED · OM·Diet interview failed' },
  ENROLLED:  { bg: 'rgba(16,185,129,.16)', color: '#047857', label: 'ENROLLED · roster dietitian' },
}

// §5 — Onboarding & approval section. Only meaningfully rendered for
// non-real (pipeline-enrolled) dietitians; real roster dietitians get a
// simple "already onboarded" note with a forced ENROLLED badge.
const OnboardingSection = ({ bundle, onChanged }: OnboardingSectionProps) => {
  const { dietitian: d, details } = bundle
  const [bankOpen, setBankOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)

  if (d.real) {
    return (
      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
          <FiBriefcase size={13} /> Onboarding &amp; approval
        </div>
        <span className="inline-flex items-center text-[11px] font-extrabold rounded-full px-2.5 py-1" style={{ background: STATUS_META.ENROLLED.bg, color: STATUS_META.ENROLLED.color }}>
          {STATUS_META.ENROLLED.label}
        </span>
        <p className="text-[13px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
          Roster dietitian · already onboarded · assignable to camps.
        </p>
      </div>
    )
  }

  const meta = STATUS_META[d.status]
  const bankAccounts = details.bankAccounts || []
  const hasBank = bankAccounts.length >= 1
  const hasResume = !!(d.resumeUrl || '').trim()
  const hasDevices = (d.deviceAlignment || []).length >= 1
  const complete = hasBank && hasResume && hasDevices

  const handleSubmit = async () => {
    if (!dietitianOnboardingComplete(d.id)) {
      toast.error('Complete bank, resume and device alignment first')
      return
    }
    await submitDietitianForInterview(d.id)
    toast.success('Submitted for OM·Diet interview')
    onChanged()
  }

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiBriefcase size={13} /> Onboarding &amp; approval
      </div>

      <span className="inline-flex items-center text-[11px] font-extrabold rounded-full px-2.5 py-1" style={{ background: meta.bg, color: meta.color }}>
        {meta.label}
      </span>

      <div className="grid gap-y-1.5 text-[13px] mt-3" style={{ gridTemplateColumns: '190px 1fr' }}>
        <div className="flex items-center gap-1.5" style={{ color: hasBank ? '#047857' : '#b91c1c' }}>
          {hasBank ? <FiCheck size={13} /> : <FiX size={13} />} Bank/payment method
        </div>
        <div style={{ color: 'var(--qms-text)' }}>
          {hasBank ? `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''} · ${bankAccounts.map((b) => b.label || 'Account').join(', ')}` : 'None added'}
        </div>
        <div className="flex items-center gap-1.5" style={{ color: hasResume ? '#047857' : '#b91c1c' }}>
          {hasResume ? <FiCheck size={13} /> : <FiX size={13} />} Resume
        </div>
        <div style={{ color: 'var(--qms-text)' }}>
          {hasResume ? <a href={d.resumeUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--qms-brand)' }}>{d.resumeUrl}</a> : 'Not uploaded'}
        </div>
        <div className="flex items-center gap-1.5" style={{ color: hasDevices ? '#047857' : '#b91c1c' }}>
          {hasDevices ? <FiCheck size={13} /> : <FiX size={13} />} Device alignment
        </div>
        <div style={{ color: 'var(--qms-text)' }}>
          {hasDevices ? (d.deviceAlignment || []).join(', ') : 'None aligned'}
        </div>
      </div>

      {d.status === 'SUBMITTED' && (
        <p className="text-[12px] mt-2.5" style={{ color: '#1d4ed8' }}>
          Awaiting OM·Diet interview{d.interview?.scheduledAt ? ` · submitted ${fmtDate(d.interview.scheduledAt)}` : ''}
        </p>
      )}
      {d.status === 'APPROVED' && (
        <p className="text-[12px] mt-2.5" style={{ color: '#047857' }}>
          Approved by {d.approvedBy || 'OM·Diet'}{d.approvedAt ? ` on ${fmtDate(d.approvedAt)}` : ''}
        </p>
      )}
      {d.status === 'REJECTED' && (
        <p className="text-[12px] mt-2.5" style={{ color: '#b91c1c' }}>
          Rejected by OM·Diet{d.rejectedReason ? ` · reason: ${d.rejectedReason}` : ''}
        </p>
      )}

      {(d.status === 'PENDING' || d.status === 'REJECTED') && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setBankOpen(true)}>
              <FiCreditCard size={12} /> Add bank/payment method
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setResumeOpen(true)}>
              <FiFileText size={12} /> Upload resume
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeviceOpen(true)}>
              <FiCpu size={12} /> Device alignment
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!complete}
              style={!complete ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <FiSend size={12} /> Submit for OM·Diet interview
            </Button>
          </div>
          {!complete && (
            <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              Complete all three onboarding steps to enable submission.
            </p>
          )}
        </>
      )}

      <BankAddDialog open={bankOpen} dietitianId={d.id} dietitianName={d.name} onClose={() => setBankOpen(false)} onSaved={() => { setBankOpen(false); onChanged() }} />
      <ResumeUploadDialog open={resumeOpen} dietitianId={d.id} currentResumeUrl={d.resumeUrl || ''} onClose={() => setResumeOpen(false)} onSaved={() => { setResumeOpen(false); onChanged() }} />
      <DeviceAlignmentDialog open={deviceOpen} dietitianId={d.id} current={d.deviceAlignment || []} onClose={() => setDeviceOpen(false)} onSaved={() => { setDeviceOpen(false); onChanged() }} />
    </div>
  )
}

export default OnboardingSection
