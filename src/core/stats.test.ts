import { describe, expect, it } from 'vitest'
import { chartMax, csvFileName, dayKey, formatMinutes, sessionsToCsv, summarize, timeByTask, type SessionRecord } from './stats'

let n = 0
function rec(endedAt: Date, minutes = 25, task = '', extra: Partial<SessionRecord> = {}): SessionRecord {
  return { id: `s${n++}`, endedAt: endedAt.getTime(), minutes, task, photoId: null, photoTitle: '', demo: false, ...extra }
}

// "Now" is Saturday Nov 7, 2026, 3 pm local time.
const now = new Date(2026, 10, 7, 15, 0).getTime()
const day = (daysAgo: number, h = 10) => new Date(2026, 10, 7 - daysAgo, h, 0)

describe('summarize', () => {
  it('is empty with no sessions', () => {
    const s = summarize([], now)
    expect(s.today).toEqual({ count: 0, minutes: 0 })
    expect(s.week).toHaveLength(7)
    expect(s.streak).toBe(0)
    expect(s.allCount).toBe(0)
  })

  it('counts today, the last 7 days and all time', () => {
    const records = [rec(day(0)), rec(day(0, 13), 50), rec(day(2)), rec(day(6)), rec(day(7)), rec(day(30))]
    const s = summarize(records, now)
    expect(s.today).toEqual({ count: 2, minutes: 75 })
    expect(s.weekCount).toBe(4)
    expect(s.weekMinutes).toBe(125)
    expect(s.week.map((d) => d.count)).toEqual([1, 0, 0, 0, 1, 0, 2])
    expect(dayKey(s.week[6].start)).toBe('2026-11-07')
    expect(s.allCount).toBe(6)
    expect(s.allMinutes).toBe(175)
  })

  it('streak counts days in a row ending today', () => {
    expect(summarize([rec(day(0)), rec(day(1)), rec(day(2)), rec(day(4))], now).streak).toBe(3)
  })

  it('streak still counts from yesterday if nothing yet today', () => {
    expect(summarize([rec(day(1)), rec(day(2))], now).streak).toBe(2)
    expect(summarize([rec(day(2))], now).streak).toBe(0)
  })

  it('a session just after midnight belongs to the new day', () => {
    const s = summarize([rec(new Date(2026, 10, 7, 0, 5)), rec(new Date(2026, 10, 6, 23, 55))], now)
    expect(s.today.count).toBe(1)
    expect(s.week[5].count).toBe(1)
  })

  it('notes demo-speed sessions', () => {
    expect(summarize([rec(day(0), 25, '', { demo: true })], now).hasDemo).toBe(true)
  })
})

describe('timeByTask', () => {
  it('adds up minutes per task, biggest first', () => {
    const t = timeByTask([rec(day(0), 25, 'Essay'), rec(day(1), 50, 'Reading'), rec(day(2), 25, ' Essay '), rec(day(3), 10, '')])
    expect(t).toEqual([
      { task: 'Essay', minutes: 50 },
      { task: 'Reading', minutes: 50 },
      { task: 'No label', minutes: 10 },
    ])
  })
})

describe('formatting', () => {
  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(90)).toBe('1.5h')
  })

  it('picks a chart scale', () => {
    const w = (m: number) => [{ start: 0, minutes: m, count: 1 }]
    expect(chartMax(w(0))).toBe(60)
    expect(chartMax(w(61))).toBe(120)
    expect(chartMax(w(180))).toBe(180)
  })
})

describe('CSV export', () => {
  it('writes a header and one row per session, oldest first', () => {
    const csv = sessionsToCsv([rec(new Date(2026, 10, 7, 9, 5), 50, 'Reading', { photoTitle: 'IMG_1', demo: true }), rec(new Date(2026, 10, 6, 21, 30), 25)])
    expect(csv.split('\r\n')).toEqual([
      'date,time,minutes,task,photo,demo_speed',
      '2026-11-06,21:30,25,,,no',
      '2026-11-07,09:05,50,Reading,IMG_1,yes',
      '',
    ])
  })

  it('quotes commas, quotes and line breaks', () => {
    const csv = sessionsToCsv([rec(day(0), 25, 'Essay, draft "2"\nfinal')])
    expect(csv).toContain('"Essay, draft ""2""\nfinal"')
  })

  it('names the file by date', () => {
    expect(csvFileName(now)).toBe('photo-focus-stats-2026-11-07.csv')
  })
})
