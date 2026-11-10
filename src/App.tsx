import { formatDuration } from './core/format'

/** Milestone 1: a hello page that proves the deploy works. */
export function App() {
  return (
    <main className="hello">
      <p className="hello-time">{formatDuration(25 * 60)}</p>
      <h1>Photo Focus</h1>
      <p className="hello-sub">Hello from your iPad, iPhone or Mac.</p>
      <p className="hello-version">Version {__APP_VERSION__}</p>
    </main>
  )
}
