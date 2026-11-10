import type { ComponentType } from 'react'
import type { FaceId } from '../core/clock'
import { DigitalFace } from './DigitalFace'
import { FlipFace } from './FlipFace'
import type { FaceProps } from './types'
import './faces.css'

export const FACE_COMPONENTS: Record<FaceId, ComponentType<FaceProps>> = {
  digital: DigitalFace,
  flip: FlipFace,
}

/** Faces that show the thin progress bar under them. */
export const FACES_WITH_BAR: ReadonlySet<FaceId> = new Set(['digital', 'flip'])
