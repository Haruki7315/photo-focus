import type { ComponentType } from 'react'
import type { FaceId } from '../core/clock'
import { AnalogFace } from './AnalogFace'
import { ApertureFace } from './ApertureFace'
import { DigitalFace } from './DigitalFace'
import { DotsFace } from './DotsFace'
import { FlipFace } from './FlipFace'
import { GoldenFace } from './GoldenFace'
import { HourglassFace } from './HourglassFace'
import { MoonFace } from './MoonFace'
import { RingFace } from './RingFace'
import { StarTrailFace } from './StarTrailFace'
import { SunArcFace } from './SunArcFace'
import { TypewriterFace } from './TypewriterFace'
import type { FaceProps } from './types'
import './faces.css'

export const FACE_COMPONENTS: Record<FaceId, ComponentType<FaceProps>> = {
  digital: DigitalFace,
  flip: FlipFace,
  typewriter: TypewriterFace,
  dots: DotsFace,
  ring: RingFace,
  dial: AnalogFace,
  hourglass: HourglassFace,
  aperture: ApertureFace,
  golden: GoldenFace,
  sun: SunArcFace,
  moon: MoonFace,
  stars: StarTrailFace,
}

/** Faces that show the thin progress bar under them (same as the prototype). */
export const FACES_WITH_BAR: ReadonlySet<FaceId> = new Set(['digital', 'flip', 'typewriter', 'golden'])
