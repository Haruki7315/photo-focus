import { describe, expect, it } from 'vitest'
import { classifySwipe } from './gesture'

describe('classifySwipe', () => {
  it('finger moving left means "left" (next photo)', () => {
    expect(classifySwipe(-120, 10, 200)).toBe('left')
  })
  it('finger moving right means "right" (previous photo)', () => {
    expect(classifySwipe(90, -5, 300)).toBe('right')
  })
  it('a tap or tiny move is not a swipe', () => {
    expect(classifySwipe(0, 0, 100)).toBeNull()
    expect(classifySwipe(30, 0, 100)).toBeNull()
  })
  it('mostly up/down is not a swipe', () => {
    expect(classifySwipe(80, 60, 200)).toBeNull()
    expect(classifySwipe(10, 200, 200)).toBeNull()
  })
  it('a slow drag is not a swipe', () => {
    expect(classifySwipe(200, 0, 1500)).toBeNull()
  })
})
