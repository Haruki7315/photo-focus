import type { ReactNode } from 'react'

/** A labeled settings row. */
export function Row(props: { label: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="row">
      <span className="rowlabel">{props.label}</span>
      {props.children}
      {props.note && <span className="rownote">{props.note}</span>}
    </div>
  )
}

export function Group(props: { title: string; children: ReactNode }) {
  return (
    <section className="group">
      <h3 className="glabel">{props.title}</h3>
      {props.children}
    </section>
  )
}

export function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  )
}
