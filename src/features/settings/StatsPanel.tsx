import { useEffect, useMemo, useState } from 'react'
import { csvFileName, formatMinutes, sessionsToCsv, summarize, timeByTask, type SessionRecord } from '../../core/stats'
import { saveTextFile } from '../../platform/saveFile'
import { Group } from '../../ui/Row'
import { getDisplayUrl } from '../photos/photoUrls'
import { forgetSessionThumbs, SessionThumb, sessionThumbUrl } from '../stats/SessionThumb'
import type { Stats } from '../stats/useStats'
import { WeekChart } from '../stats/WeekChart'

const PAGE = 24
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Full-screen view of a completed photo. Uses the full photo if it's still in the app. */
function Lightbox({ rec, onClose }: { rec: SessionRecord; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const full = rec.photoId ? await getDisplayUrl(rec.photoId).catch(() => null) : null
      const u = full ?? (await sessionThumbUrl(rec.id))
      if (alive) setUrl(u)
    })()
    return () => {
      alive = false
    }
  }, [rec])
  const d = new Date(rec.endedAt)
  return (
    <div className="lightbox" role="dialog" aria-label="Completed photo" onClick={onClose}>
      {url && <img src={url} alt={rec.photoTitle || 'Completed photo'} />}
      <p>
        <b>{rec.task || 'Focus'}</b> · {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
        {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {rec.minutes} min
        {rec.photoTitle ? ` · ${rec.photoTitle}` : ''}
      </p>
      <button type="button" className="btn">Close</button>
    </div>
  )
}

export function StatsPanel({ stats, onMessage }: { stats: Stats; onMessage: (text: string) => void }) {
  const { records } = stats
  const [now] = useState(() => Date.now())
  const s = useMemo(() => summarize(records, now), [records, now])
  const tasks = useMemo(() => timeByTask(records), [records])
  const newest = useMemo(() => [...records].reverse(), [records])
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState<SessionRecord | null>(null)
  const [armed, setArmed] = useState(false)

  // The "Tap again" confirm turns itself off after a few seconds.
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  if (!records.length) {
    return (
      <Group title="Stats">
        <p className="note">No sessions yet. Finish a focus session and it will show up here, with the photo you looked at.</p>
        <p className="note">Skipped sessions aren't saved.</p>
      </Group>
    )
  }

  const top = tasks[0]?.minutes || 1
  return (
    <>
      <Group title="Stats">
        <p className="note">
          {plural(records.length, 'session')} saved on this device.
          {s.hasDemo ? ' Sessions finished at demo speed count their full length.' : ''}
        </p>
        <div className="statgrid">
          <div className="stat"><span className="k">Today</span><span className="v">{plural(s.today.count, 'session')}</span><span className="s">{formatMinutes(s.today.minutes)} focused</span></div>
          <div className="stat"><span className="k">Last 7 days</span><span className="v">{formatMinutes(s.weekMinutes)}</span><span className="s">{plural(s.weekCount, 'session')}</span></div>
          <div className="stat"><span className="k">Streak</span><span className="v">{plural(s.streak, 'day')}</span><span className="s">in a row</span></div>
          <div className="stat"><span className="k">All time</span><span className="v">{plural(s.allCount, 'session')}</span><span className="s">{formatMinutes(s.allMinutes)} total</span></div>
        </div>
      </Group>

      <Group title="Last 7 days">
        <WeekChart week={s.week} />
      </Group>

      <Group title="By task">
        <div className="tasklist">
          {tasks.map((t) => (
            <div key={t.task} className="taskrow">
              <span>{t.task}</span>
              <span>{formatMinutes(t.minutes)}</span>
              <i style={{ width: `${((t.minutes / top) * 100).toFixed(1)}%` }} />
            </div>
          ))}
        </div>
      </Group>

      <Group title="Completed photos">
        <div className="gallery">
          {newest.slice(0, shown).map((r) => {
            const d = new Date(r.endedAt)
            return (
              <button key={r.id} type="button" className="gallery-item" onClick={() => setOpen(r)} aria-label={`View ${r.photoTitle || 'photo'}`}>
                <SessionThumb id={r.id} alt={r.photoTitle || 'Completed photo'} />
                <span className="gcap">
                  <b>{r.task || 'Focus'}</b>
                  <br />
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {r.minutes}m
                </span>
              </button>
            )
          })}
        </div>
        {newest.length > shown && (
          <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>Show more</button>
        )}
      </Group>

      <Group title="Your data">
        <div className="inline">
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const r = await saveTextFile(csvFileName(Date.now()), sessionsToCsv(records))
              if (r !== 'cancelled') onMessage('Stats exported as a CSV file. It opens in Numbers or Excel.')
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              if (!armed) {
                setArmed(true)
                return
              }
              setArmed(false)
              await stats.clear()
              forgetSessionThumbs()
              onMessage('Stats cleared.')
            }}
          >
            {armed ? 'Tap again to delete all' : 'Clear my stats'}
          </button>
        </div>
        <p className="note">Clearing removes all sessions and gallery photos from stats. Your photos in the app stay.</p>
      </Group>

      {open && <Lightbox rec={open} onClose={() => setOpen(null)} />}
    </>
  )
}
