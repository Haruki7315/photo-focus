interface Option<T extends string> {
  value: T
  label: string
}

/** A row of buttons where exactly one is selected. */
export function Segmented<T extends string>(props: {
  label: string
  options: ReadonlyArray<Option<T>>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="seg" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === props.value} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
