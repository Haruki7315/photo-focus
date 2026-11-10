import { TimerTestPanel } from './features/timer/TimerTestPanel'

/** Milestone 2: timer engine test screen. */
export function App() {
  return (
    <main className="hello">
      <h1>Photo Focus</h1>
      <TimerTestPanel />
      <p className="hello-version">Version {__APP_VERSION__}</p>
    </main>
  )
}
