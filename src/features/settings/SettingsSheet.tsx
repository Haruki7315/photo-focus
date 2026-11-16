import { useEffect, useState, type ReactNode } from 'react'
import { installUpdate, onUpdateReady } from '../../platform/serviceWorker'
import { isAppleMobile, isStandalone } from '../../platform/fullscreen'
import { Icon } from '../../ui/Icon'

export type SettingsTab = 'photos' | 'look' | 'clock' | 'sound' | 'stats'

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'photos', label: 'Photos' },
  { id: 'look', label: 'Look' },
  { id: 'clock', label: 'Clock' },
  { id: 'sound', label: 'Sound' },
  { id: 'stats', label: 'Stats' },
]

/** Settings panel: slides in from the right on iPad/Mac, up from the bottom on iPhone. */
export function SettingsSheet(props: { onClose: () => void; message: string | null; render: (tab: SettingsTab) => ReactNode }) {
  const [tab, setTab] = useState<SettingsTab>('photos')
  const [updateReady, setUpdateReady] = useState(false)
  useEffect(() => onUpdateReady(setUpdateReady), [])
  const [showInstallTip] = useState(() => isAppleMobile() && !isStandalone())
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <aside className="sheet" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="sheet-close" aria-label="Close settings" onClick={props.onClose}>
            <Icon name="close" />
          </button>
        </header>
        {props.message && <p className="sheet-msg" aria-live="polite">{props.message}</p>}
        {updateReady && (
          <div className="sheet-msg sheet-update">
            <span>A new version is ready.</span>
            <button type="button" className="btn primary" onClick={installUpdate}>
              Update
            </button>
          </div>
        )}
        <div className="sheet-body">
          {props.render(tab)}
          {showInstallTip && (
            <p className="note sheet-version">Tip: tap Share → Add to Home Screen. It then opens full screen and works offline.</p>
          )}
          <p className="note sheet-version">Photo Focus · version {__APP_VERSION__}</p>
        </div>
      </aside>
    </div>
  )
}
