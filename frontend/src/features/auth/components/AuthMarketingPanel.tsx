import { FiMapPin, FiShield, FiLock, FiGrid } from 'react-icons/fi'

const STATS = [
  { value: '12,400+', label: 'Camps executed' },
  { value: '2.1M', label: 'Patients reached' },
  { value: '28', label: 'Pharma clients' },
]

const BADGES = [
  { icon: FiShield, label: 'DPDP-ready' },
  { icon: FiLock, label: 'SOC 2 in progress' },
  { icon: FiGrid, label: 'ABDM compatible' },
]

const AuthMarketingPanel = () => {
  return (
    <div className="auth-panel hidden lg:flex lg:w-[52%] flex-col p-12 relative overflow-hidden">
      <div className="auth-panel-dots absolute inset-0 pointer-events-none" />

      <div className="relative flex items-center gap-2.5">
        <div className="auth-logo w-10 h-10 rounded-2xl flex items-center justify-center">
          <FiMapPin size={20} color="white" strokeWidth={2.2} />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">QMS</span>
      </div>

      <div className="relative flex-1 flex flex-col justify-center">
        <h1 className="font-bold text-white mb-4 auth-headline">
          The healthcare operations <span className="auth-headline-accent">command center</span> for pharma
          India.
        </h1>
        <p className="mb-8 max-w-sm auth-subcopy">
          Run camps, field officers, doctors, devices and revenue from one AI-native platform. Built for
          PAN-India scale and pharma-grade compliance.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="auth-stat-card rounded-xl px-4 py-3">
              <div className="text-white font-bold leading-tight auth-stat-value">{stat.value}</div>
              <div className="mt-0.5 auth-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5">
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-blue-300 text-xs">
              <Icon size={13} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AuthMarketingPanel
