import { useEffect, useState } from 'react'
import { FocusScreen } from './features/focus/FocusScreen'
import { loadAppSettings, type AppSettings } from './features/settings/appSettings'

/** Loads saved settings, then shows the focus screen. */
export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  useEffect(() => {
    loadAppSettings().then(setSettings)
  }, [])
  return settings ? <FocusScreen initial={settings} /> : <div className="boot" />
}
