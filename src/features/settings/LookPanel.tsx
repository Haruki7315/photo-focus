import { BACKGROUNDS, MAT_MAX, backgroundName, type LookSettings } from '../../core/look'
import { Check, Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import { Swatches } from '../../ui/Swatches'

const BLUR_CHIP = { background: 'radial-gradient(circle at 30% 30%, #f0a95a, #3b2b3a 70%)' }

export function LookPanel({ look, onChange }: { look: LookSettings; onChange: (patch: Partial<LookSettings>) => void }) {
  return (
    <Group title="Screen">
      <Row label="Photo fit">
        <Segmented
          label="Photo fit"
          options={[
            { value: 'contain', label: 'Whole photo' },
            { value: 'cover', label: 'Fill screen' },
          ]}
          value={look.fit}
          onChange={(fit) => onChange({ fit })}
        />
      </Row>
      <Row label="Background" note={backgroundName(look.background)}>
        <Swatches
          label="Background"
          options={BACKGROUNDS.map((b) => (b.value === 'blur' ? { ...b, style: BLUR_CHIP } : b))}
          value={look.background}
          customDefault="#7a4b3a"
          onChange={(background) => onChange({ background })}
        />
      </Row>
      <Row label={<>Border around photo (mat) <output>{look.mat}</output></>}>
        <input
          type="range"
          min={0}
          max={MAT_MAX}
          value={look.mat}
          aria-label="Mat border size"
          onChange={(e) => onChange({ mat: +e.target.value })}
        />
      </Row>
      <div className="checks">
        <Check label="Show photo" checked={look.showPhoto} onChange={(showPhoto) => onChange({ showPhoto })} />
        <Check label="Photo info" checked={look.showCaption} onChange={(showCaption) => onChange({ showCaption })} />
        <Check label="Night mode" checked={look.night} onChange={(night) => onChange({ night })} />
      </div>
    </Group>
  )
}
