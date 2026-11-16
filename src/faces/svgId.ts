import { useId } from 'react'

/** A unique id that is safe inside SVG url(#...) references (React ids contain symbols). */
export function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}
