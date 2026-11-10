import type { FontId } from '../core/clock'

// Font files are bundled with the app (Fontsource, OFL license): no requests
// to Google, and they keep working offline. Only the weights we use are loaded.
import '@fontsource/outfit/latin-200.css'
import '@fontsource/newsreader/latin-300.css'
import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource/quicksand/latin-400.css'
import '@fontsource/jetbrains-mono/latin-300.css'
import '@fontsource/silkscreen/latin-400.css'

/** [CSS font-family, weight, letter-spacing], same as the prototype. */
export const FONT_STYLES: Record<FontId, [string, number, string]> = {
  clean: ['"Outfit", system-ui, sans-serif', 200, '-0.02em'],
  serif: ['"Newsreader", Georgia, serif', 300, '0'],
  classic: ['"DM Serif Display", Georgia, serif', 400, '0'],
  poster: ['"Bebas Neue", "Arial Narrow", sans-serif', 400, '0.01em'],
  rounded: ['"Quicksand", system-ui, sans-serif', 400, '0'],
  mono: ['"JetBrains Mono", ui-monospace, monospace', 300, '-0.04em'],
  pixel: ['"Silkscreen", ui-monospace, monospace', 400, '0'],
}
