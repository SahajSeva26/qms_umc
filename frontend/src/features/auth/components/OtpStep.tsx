import { useRef, useState, useEffect } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface OtpStepProps {
  email: string
  onVerify: (otp: string) => void
  onBack: () => void
  isLoading: boolean
  error?: string
}

const OtpStep = ({ email, onVerify, onBack, isLoading, error }: OtpStepProps) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [resendSeconds, setResendSeconds] = useState(28)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== '')) {
      onVerify(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...digits]
    pasted.split('').forEach((char, i) => { next[i] = char })
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    inputRefs.current[lastFilled]?.focus()
    if (pasted.length === 6) onVerify(pasted)
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-[#aab2dc] hover:text-gray-700 dark:hover:text-[#e8ebff] mb-5 transition-colors"
      >
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 dark:text-[#e8ebff]">Verify it's you</h2>
      <p className="text-sm text-gray-500 dark:text-[#aab2dc] mt-1 mb-6">
        We sent a 6-digit code to <span className="font-semibold text-gray-700 dark:text-[#e8ebff]">{email}</span>.
      </p>

      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 text-center text-lg font-bold border border-gray-300 dark:border-[rgba(148,168,255,0.22)] rounded-lg outline-none focus:border-blue-500 dark:focus:border-[rgba(148,168,255,0.5)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-[rgba(90,139,255,0.35)] transition-all bg-white dark:bg-[rgba(22,29,62,0.85)] text-gray-900 dark:text-[#e8ebff]"
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-gray-400 dark:text-[#7b85b8]">
          {resendSeconds > 0 ? (
            <>Resend in <span className="font-semibold text-gray-600 dark:text-[#aab2dc]">{resendSeconds}s</span></>
          ) : (
            <button
              onClick={() => setResendSeconds(28)}
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Resend code
            </button>
          )}
        </span>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={() => onVerify(digits.join(''))}
        disabled={isLoading || digits.some((d) => d === '')}
        className="w-full py-3 px-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0"
        style={{ background: 'linear-gradient(135deg, #3b6dff 0%, #0ea5e9 100%)' }}
      >
        {isLoading ? 'Verifying...' : 'Verify and sign in'}
      </button>

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[rgba(148,168,255,0.12)] flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-[#7b85b8]">© QMS Health Platforms</span>
        <ThemeToggle />
      </div>
    </div>
  )
}

export default OtpStep
