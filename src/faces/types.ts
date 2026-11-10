import type { ClockDisplay, ClockSettings } from '../core/clock'

/** Every clock face gets the same inputs. */
export interface FaceProps {
  display: ClockDisplay
  settings: ClockSettings
}
