import { Toaster as SharedToaster, toast, type ToasterProps } from '@qms/ui'
import { useThemeStore } from '@/store/themeStore'

// Thin app-local wrapper — supplies this app's own themeStore to the shared,
// prop-driven Toaster.
const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useThemeStore((s) => s.isDark)
  return <SharedToaster isDark={isDark} {...props} />
}

export { Toaster, toast }
