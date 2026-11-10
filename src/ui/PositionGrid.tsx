/** 3x3 grid of dots for picking where something sits on screen. */
export function PositionGrid<T extends string>(props: {
  label: string
  options: ReadonlyArray<{ id: T; name: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="posgrid" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.id} type="button" aria-label={o.name} title={o.name} aria-pressed={o.id === props.value} onClick={() => props.onChange(o.id)} />
      ))}
    </div>
  )
}
