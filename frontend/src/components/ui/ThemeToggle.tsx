import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

const ThemeToggle = () => {
  const { isDark, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      className="w-7 h-7 rounded-full border border-gray-200 dark:border-[rgba(148,168,255,0.22)] flex items-center justify-center text-gray-400 dark:text-[#aab2dc] hover:border-gray-300 dark:hover:border-[rgba(148,168,255,0.4)] hover:text-gray-600 dark:hover:text-[#e8ebff] transition-all"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  )
}

export default ThemeToggle
