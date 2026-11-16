import type { ClockDisplay, ClockSettings } from '../core/clock'
import type { SkyLocation } from '../core/sky'

/** Every clock face gets the same inputs. */
export interface FaceProps {
  display: ClockDisplay
  settings: ClockSettings
  /** Current time in ms. */
  now: number
  /** Where Golden hour and Sun arc look. */
  sky: SkyLocation
  /** Demo speed is on (some animations speed up). */
  demo: boolean
}
