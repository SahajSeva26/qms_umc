import { Toaster as SharedToaster, toast, type ToasterProps } from '@qms/ui'
import { useThemeStore } from '@/store/themeStore'

// Thin app-local wrapper — supplies this app's own themeStore to the shared,
// prop-driven Toaster. All ~80 `toast(...)` call sites keep importing from
// this same path; only this one file needed to change.
const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useThemeStore((s) => s.isDark)
  return <SharedToaster isDark={isDark} {...props} />
}

export { Toaster, toast }
