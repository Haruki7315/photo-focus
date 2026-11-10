import { burnInOffset, clockColors, getClockDisplay, type ClockSettings } from '../../core/clock'
import type { TimerView } from '../../core/timer'
import { FACE_COMPONENTS, FACES_WITH_BAR } from '../../faces'
import { FONT_STYLES } from '../../faces/fonts'

/** The clock or timer drawn over the photo. */
export function ClockOverlay(props: { settings: ClockSettings; timer: TimerView; now: number; night: boolean }) {
  const { settings: s } = props
  const display = getClockDisplay(s, props.timer, new Date(props.now))
  const colors = clockColors(s.color, props.night)
  const [family, weight, spacing] = FONT_STYLES[s.font]
  const shift = burnInOffset(props.now)
  const Face = FACE_COMPONENTS[s.face]
  const showBar = s.progressBar && display.showBar && FACES_WITH_BAR.has(s.face)

  const style = {
    '--ts': s.size,
    '--op': s.opacity / 100,
    '--cc': colors.color,
    '--cf': family,
    '--cw': weight,
    '--cls': spacing,
    '--shadowc': colors.shadow,
    '--glass': colors.glass,
    '--cardbg': colors.cardBg,
    '--cardfg': colors.cardFg,
    '--bx': `${shift.x}px`,
    '--by': `${shift.y}px`,
  } as React.CSSProperties

  return (
    <div className={`overlay p-${s.position[0]} p-${s.position[1]} bd-${s.backdrop}`} style={style} aria-live="off">
      {s.label && <div className="t-sub">{display.sub}</div>}
      <div className="face">
        <Face display={display} settings={s} />
      </div>
      {showBar && (
        <div className="t-bar">
          <i style={{ width: `${display.frac * 100}%` }} />
        </div>
      )}
    </div>
  )
}
