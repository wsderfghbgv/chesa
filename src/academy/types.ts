/**
 * Tipos de la Academia de Aperturas.
 *
 * El contenido (biblioteca) es DATO PURO y declarativo: jugadas en SAN inglés (las valida chess.js
 * al compilar) + anotaciones pedagógicas. Todo lo que se pueda calcular (casillas controladas,
 * amenazas, flechas, jugadas alternativas de la teoría…) se deriva de la posición real en
 * `lessons.ts` / `moveExplainer.ts`, nunca se escribe a mano, para que no pueda quedar desfasado.
 */
import type { Square } from 'chess.js';
import type { Color } from '../chess/utils';

export type OpeningCategory =
  | 'abiertas'
  | 'semiabiertas'
  | 'cerradas'
  | 'semicerradas'
  | 'flanco'
  | 'defensas'
  | 'gambitos';

export const CATEGORY_LABELS: Record<OpeningCategory, string> = {
  abiertas: 'Abiertas',
  semiabiertas: 'Semiabiertas',
  cerradas: 'Cerradas',
  semicerradas: 'Semicerradas',
  flanco: 'De flanco',
  defensas: 'Defensas',
  gambitos: 'Gambitos',
};

export const CATEGORY_HINTS: Record<OpeningCategory, string> = {
  abiertas: '1.e4 e5 · centro abierto y táctica directa',
  semiabiertas: '1.e4 con otra respuesta · desequilibrio inmediato',
  cerradas: '1.d4 d5 · maniobra posicional y peones centrales',
  semicerradas: '1.d4 sin …d5 · esquemas indios y estructuras flexibles',
  flanco: 'Se empieza por los flancos (1.c4, 1.Cf3, 1.f4…)',
  defensas: 'Sistemas con los que las negras responden a 1.e4 / 1.d4',
  gambitos: 'Sacrificio de material a cambio de iniciativa',
};

export type Level = 'basico' | 'intermedio' | 'avanzado';
export const LEVEL_LABELS: Record<Level, string> = {
  basico: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};
export const LEVEL_ORDER: Record<Level, number> = { basico: 0, intermedio: 1, avanzado: 2 };

/** Anotación de una jugada: [por qué se juega y qué objetivo tiene, consecuencia estratégica, qué pasa si se juega otra cosa]. */
export type NoteTuple = [why: string, consequence?: string, alternative?: string];
export type Note = string | NoteTuple;

export interface LineDef {
  id: string;
  name: string;
  kind: 'principal' | 'secundaria' | 'trampa';
  /** ECO específico de la variante (si difiere del de la apertura). */
  eco?: string;
  /** Una frase que resume la idea de la variante. */
  idea?: string;
  /** Jugadas en SAN inglés separadas por espacios, SIN números, desde la posición inicial. */
  moves: string;
  /** Anotaciones por ply (1 = primera jugada de blancas). Las jugadas ya anotadas en otra línea de la misma apertura se heredan por posición. */
  notes?: Record<number, Note>;
}

export interface TrapDef {
  id: string;
  name: string;
  /** Jugadas SAN desde el inicio hasta el momento en que se consuma la trampa. */
  moves: string;
  /** Bando que cae en la trampa. */
  victim: Color;
  /** Ply (1-based) de la jugada errónea de la víctima. */
  mistakePly: number;
  explanation: string;
}

export interface FamousGame {
  white: string;
  black: string;
  event: string;
  year: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  note: string;
}

export interface KeySquareDef {
  square: Square;
  role: string;
}

export interface DevelopmentDef {
  piece: string;
  idea: string;
}

export interface OpeningDef {
  id: string;
  name: string;
  /** Nombre corto para tarjetas. */
  short?: string;
  eco: string;
  category: OpeningCategory;
  /** Bando que suele escoger esta apertura (o 'both' si es habitual para ambos). */
  side: Color | 'both';
  level: Level;
  /** 1 (rara) … 5 (muy frecuente en todos los niveles). */
  popularity: 1 | 2 | 3 | 4 | 5;
  /** Frase breve sobre su frecuencia de uso. */
  frequency: string;
  history: string;
  goals: string[];
  plans: { w: string[]; b: string[] };
  structures: string[];
  keySquares: KeySquareDef[];
  development: DevelopmentDef[];
  commonMistakes: string[];
  traps: TrapDef[];
  famousGames: FamousGame[];
  /** Primera línea = línea principal; el resto, variantes secundarias. */
  lines: LineDef[];
  /** Bando desde el que se recomienda estudiarla por defecto. */
  studyAs?: Color;
}

/* ------------------------------ Compilación ------------------------------ */

export interface Arrow {
  orig: Square;
  dest: Square;
  brush: 'green' | 'blue' | 'yellow' | 'red';
}

export interface MoveTeaching {
  /** ¿Por qué se juega y qué objetivo tiene? (texto de autor o generado). */
  why: string;
  /** Consecuencias estratégicas. */
  consequence: string;
  /** Qué pasa si se juega otra cosa (texto de autor + alternativas teóricas derivadas). */
  alternative: string;
  /** Qué casillas controla la jugada (derivado de la posición). */
  controls: string;
  /** Qué amenaza genera (derivado). */
  threat: string;
  /** Qué pretende el rival a continuación (derivado de la siguiente jugada teórica). */
  rival: string;
  /** Casillas que la pieza movida controla de nuevo. */
  controlledSquares: Square[];
  /** Casillas importantes a resaltar (centro, casilla destino, amenazas). */
  highlights: Square[];
  /** Flechas de plan (qué pretende la pieza a continuación). */
  arrows: Arrow[];
  /** Casillas atacadas o vulnerables. */
  threatened: Square[];
  /** ¿El texto proviene de una anotación de autor (true) o es puramente derivado (false)? */
  authored: boolean;
}

export interface CompiledMove {
  ply: number;
  san: string;
  sanEs: string;
  uci: string;
  from: Square;
  to: Square;
  mover: Color;
  fenBefore: string;
  fenAfter: string;
  teaching: MoveTeaching;
}

export interface CompiledLine {
  id: string;
  openingId: string;
  name: string;
  kind: LineDef['kind'];
  eco: string;
  idea: string;
  moves: CompiledMove[];
  /** FEN inicial (siempre la posición de partida) + FEN tras cada jugada. */
  fens: string[];
  pgn: string;
}

export interface CompiledOpening extends OpeningDef {
  compiled: CompiledLine[];
}

/* ------------------------------ Árbol de variantes ------------------------------ */

export interface TreeNode {
  /** Identificador estable = clave de posición tras la jugada. */
  key: string;
  ply: number;
  san: string;
  sanEs: string;
  uci: string;
  fen: string;
  mover: Color;
  parent: TreeNode | null;
  children: TreeNode[];
  /** Líneas que pasan por este nodo. */
  lineIds: string[];
  /** Es parte de la línea principal. */
  isMain: boolean;
}

/* ------------------------------ Retos ------------------------------ */

export type ChallengeType =
  | 'next-move'
  | 'find-error'
  | 'best-reply'
  | 'trap'
  | 'plan'
  | 'recognize'
  | 'develop'
  | 'continue-line';

export const CHALLENGE_LABELS: Record<ChallengeType, string> = {
  'next-move': 'Siguiente jugada correcta',
  'find-error': 'Identifica el error',
  'best-reply': 'Mejor respuesta del rival',
  trap: 'Detecta la trampa',
  plan: 'Plan estratégico',
  recognize: 'Reconoce la apertura',
  develop: '¿Qué pieza desarrollar?',
  'continue-line': 'Continúa la variante',
};

export interface ChallengeOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  openingId: string;
  lineId?: string;
  level: Level;
  statement: string;
  fen: string;
  /** Bando que mueve / desde cuya perspectiva se plantea el reto. */
  orientation: Color;
  /** Si el reto se responde moviendo en el tablero: jugadas UCI aceptadas (la primera es la canónica). */
  acceptedUci?: string[];
  /** Si el reto es de opción múltiple. */
  options?: ChallengeOption[];
  /** Pistas progresivas (de la más sutil a la más directa). */
  hints: string[];
  explanation: string;
  points: number;
  /** Flechas a mostrar al resolver. */
  reveal?: Arrow[];
  /** Posición de referencia para la repetición espaciada. */
  reviewKey?: string;
}

/* ------------------------------ Progreso ------------------------------ */

export interface ReviewCard {
  /** clave = `${openingId}|${fenKey}` */
  id: string;
  openingId: string;
  lineId: string;
  /** FEN en el que el usuario debe jugar. */
  fen: string;
  /** Jugada teórica esperada (UCI). */
  expectedUci: string;
  expectedSanEs: string;
  /** Color que mueve (el que se está estudiando). */
  color: Color;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  due: number; // epoch ms
  lastSeen: number;
}

export interface OpeningProgress {
  openingId: string;
  /** Segundos de estudio acumulados. */
  studySeconds: number;
  lessonsCompleted: string[]; // lineIds
  movesLearned: string[]; // claves de nodo del árbol de variantes (jugadas únicas aprendidas)
  practiceRuns: number;
  practiceCorrect: number;
  practiceTotal: number;
  challengesDone: number;
  challengesCorrect: number;
  /** Variantes (lineId) con dominio demostrado en práctica sin errores. */
  masteredLines: string[];
  lastStudied: number;
}

export interface MistakeRecord {
  key: string; // openingId|fenKey|expected
  openingId: string;
  fen: string;
  expectedSanEs: string;
  playedSanEs: string;
  count: number;
  last: number;
}

export interface AcademyProgress {
  version: 1;
  favorites: string[];
  openings: Record<string, OpeningProgress>;
  cards: Record<string, ReviewCard>;
  mistakes: Record<string, MistakeRecord>;
  totalSeconds: number;
  score: number;
  streakDays: number;
  lastActiveDay: string;
}
