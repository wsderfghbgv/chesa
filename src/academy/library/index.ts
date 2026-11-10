import type { OpeningDef } from '../types';
import { OPEN_OPENINGS } from './abiertas';
import { SEMIOPEN_OPENINGS } from './semiabiertas';
import { CLOSED_OPENINGS } from './cerradas';
import { SEMICLOSED_OPENINGS } from './semicerradas';
import { FLANK_OPENINGS } from './flanco';
import { GAMBIT_OPENINGS } from './gambitos';

/** Biblioteca completa de aperturas (datos declarativos; ver types.ts). */
export const OPENING_DEFS: OpeningDef[] = [
  ...OPEN_OPENINGS,
  ...SEMIOPEN_OPENINGS,
  ...CLOSED_OPENINGS,
  ...SEMICLOSED_OPENINGS,
  ...FLANK_OPENINGS,
  ...GAMBIT_OPENINGS,
];
