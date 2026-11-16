/**
 * Focus stats (ported from the prototype): today, last 7 days, streak,
 * all time, the 7-day chart, time by task, and CSV export.
 * Pure TypeScript. Days are counted in the device's local time.
 */

/** One completed focus session. Skipped sessions are never saved. */
export interface SessionRecord {
  id: string
  /** When the session finished (ms since 1970). */
  endedAt: number
  /** Session length in minutes (full length, also at demo speed). */
  minutes: number
  /** "Working on" text, or "" if none. */
  task: string
  /** The photo shown during the session (it may have been removed since). */
  photoId: string | null
  photoTitle: string
  /** Finished at demo speed (1 min = 1 sec). */
  demo: boolean
}

const DAY_MS = 86_400_000

/** "2026-11-07" in local time. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Midnight (local) of the day `daysAgo` days before `now`. Safe across daylight-saving changes. */
function startOfDay(now: number, daysAgo: number): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo).getTime()
}

export interface DayTotal {
  /** Midnight of that day (ms). */
  start: number
  minutes: number
  count: number
}

export interface StatsSummary {
  today: { count: number; minutes: number }
  /** Oldest first; the last entry is today. */
  week: DayTotal[]
  weekMinutes: number
  weekCount: number
  /** Days in a row with at least one session, ending today (or yesterday if none yet today). */
  streak: number
  allCount: number
  allMinutes: number
  hasDemo: boolean
}

export function summarize(records: readonly SessionRecord[], now: number): StatsSummary {
  const byDay = new Map<string, { minutes: number; count: number }>()
  for (const r of records) {
    const k = dayKey(r.endedAt)
    const t = byDay.get(k) ?? { minutes: 0, count: 0 }
    t.minutes += r.minutes
    t.count += 1
    byDay.set(k, t)
  }
  const week: DayTotal[] = []
  for (let i = 6; i >= 0; i--) {
    const start = startOfDay(now, i)
    const t = byDay.get(dayKey(start))
    week.push({ start, minutes: t?.minutes ?? 0, count: t?.count ?? 0 })
  }
  const today = week[6]
  let streak = 0
  for (let i = today.count ? 0 : 1; i < 3660; i++) {
    if (byDay.has(dayKey(startOfDay(now, i)))) streak++
    else break
  }
  return {
    today: { count: today.count, minutes: today.minutes },
    week,
    weekMinutes: week.reduce((a, d) => a + d.minutes, 0),
    weekCount: week.reduce((a, d) => a + d.count, 0),
    streak,
    allCount: records.length,
    allMinutes: records.reduce((a, r) => a + r.minutes, 0),
    hasDemo: records.some((r) => r.demo),
  }
}

/** Total minutes per task, biggest first (top `limit`). Sessions without a task are "No label". */
export function timeByTask(records: readonly SessionRecord[], limit = 6): Array<{ task: string; minutes: number }> {
  const m = new Map<string, number>()
  for (const r of records) {
    const k = r.task.trim() || 'No label'
    m.set(k, (m.get(k) ?? 0) + r.minutes)
  }
  return [...m.entries()]
    .map(([task, minutes]) => ({ task, minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.task.localeCompare(b.task))
    .slice(0, limit)
}

/** "45m", "1.5h", "2h" */
export function formatMinutes(m: number): string {
  if (m >= 60) return `${(m / 60).toFixed(m % 60 ? 1 : 0)}h`
  return `${Math.round(m)}m`
}

/** Top of the chart's scale: at least 1 hour, rounded up to whole hours. */
export function chartMax(week: readonly DayTotal[]): number {
  return Math.max(60, Math.ceil(Math.max(0, ...week.map((d) => d.minutes)) / 60) * 60)
}

function csvField(value: string | number | boolean): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const pad = (n: number) => String(n).padStart(2, '0')

/** All sessions as CSV (oldest first), with local date and time columns. Opens in Excel / Numbers. */
export function sessionsToCsv(records: readonly SessionRecord[]): string {
  const header = ['date', 'time', 'minutes', 'task', 'photo', 'demo_speed']
  const rows = [...records]
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((r) => {
      const d = new Date(r.endedAt)
      return [dayKey(r.endedAt), `${pad(d.getHours())}:${pad(d.getMinutes())}`, r.minutes, r.task, r.photoTitle, r.demo ? 'yes' : 'no']
        .map(csvField)
        .join(',')
    })
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

/** "photo-focus-stats-2026-11-07.csv" */
export function csvFileName(now: number): string {
  return `photo-focus-stats-${dayKey(now)}.csv`
}

export { DAY_MS }
