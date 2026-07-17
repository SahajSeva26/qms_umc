import { FiSun, FiMoon } from 'react-icons/fi'
import { useThemeStore } from '@/store/themeStore'

const ThemeToggle = () => {
  const { isDark, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      className="w-7 h-7 rounded-full border border-[var(--qms-border)] flex items-center justify-center text-[var(--qms-text-muted)] hover:border-[var(--qms-border-strong)] hover:text-[var(--qms-text)] transition-all"
      aria-label="Toggle theme"
    >
      {isDark ? <FiSun size={13} /> : <FiMoon size={13} />}
    </button>
  )
}

export default ThemeToggle
