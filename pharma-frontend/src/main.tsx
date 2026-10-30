import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppProvider from './app/AppProvider'
import { initTheme } from './store/themeStore'
import { ingestQuickSwitchTransfer } from './features/auth/quickSwitch.transfer'

initTheme()
if (import.meta.env.DEV) ingestQuickSwitchTransfer()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
)
