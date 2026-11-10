import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(25 * 60)).toBe('25:00')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(0)).toBe('00:00')
  })

  it('adds hours when needed', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('drops fractions and treats negatives as zero', () => {
    expect(formatDuration(59.9)).toBe('00:59')
    expect(formatDuration(-5)).toBe('00:00')
  })
})
