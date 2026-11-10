/** Small line icons used in the control bar. */
const PATHS = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  skip: 'M5 5.5v13l9-6.5zM16 5h3v14h-3z',
  next: 'M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4',
  heart: 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z',
  hide: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.3 7.6C4.2 9.2 3 12 3 12s4 6 9 6a8.8 8.8 0 0 0 4.2-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  close: 'M6 6l12 12M18 6L6 18',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const solid = name === 'play' || name === 'pause' || name === 'skip'
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill={solid || filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={solid ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}
