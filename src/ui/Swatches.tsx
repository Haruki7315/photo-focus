/** Round color buttons plus a custom color picker. */
export function Swatches(props: {
  label: string
  options: ReadonlyArray<{ value: string; name: string; style?: React.CSSProperties }>
  value: string
  onChange: (value: string) => void
  customDefault: string
}) {
  const isPreset = props.options.some((o) => o.value === props.value)
  return (
    <div className="swatches" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.name}
          title={o.name}
          aria-pressed={o.value === props.value}
          style={o.style ?? { background: o.value }}
          onClick={() => props.onChange(o.value)}
        />
      ))}
      <label className={`swatch-custom${isPreset ? '' : ' on'}`} title="Pick any color">
        <input
          type="color"
          aria-label="Pick any color"
          value={isPreset ? props.customDefault : props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </label>
    </div>
  )
}
