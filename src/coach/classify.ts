/**
 * Clasificación objetiva de jugadas a partir de las evaluaciones reales de Stockfish
 * antes y después del movimiento.
 *
 * Criterios:
 *  - Los umbrales son configurables (`ClassificationThresholds`).
 *  - No se penaliza una jugada solo por no coincidir con la 1ª línea del motor: si la
 *    pérdida de evaluación es mínima o si la posición ya estaba completamente decidida y
 *    sigue estándolo, la jugada se considera buena/precisa.
 *  - Se combina la pérdida en centipeones con la pérdida de expectativa de victoria
 *    (curva logística tipo Lichess), de modo que pasar de +7.00 a +5.50 no se marque como
 *    error grave, mientras que pasar de +0.80 a −0.80 sí refleje su impacto real.
 */
import type { Color, Score } from '../engine/score';
import { cpFor, isMateFor } from '../engine/score';
import type { PvLine } from '../engine/StockfishEngine';

export type MoveCategory =
  | 'excelente'
  | 'mejor'
  | 'precisa'
  | 'buena'
  | 'oportunidad_perdida'
  | 'imprecision'
  | 'error'
  | 'error_grave';

export interface CategoryMeta {
  id: MoveCategory;
  label: string;
  short: string;
  symbol: string;
  color: string;
  isPositive: boolean;
  isMistake: boolean;
}

export const CATEGORIES: Record<MoveCategory, CategoryMeta> = {
  excelente: {
    id: 'excelente', label: 'Excelente', short: 'Excelente', symbol: '!!',
    color: '#0ea5e9', isPositive: true, isMistake: false,
  },
  mejor: {
    id: 'mejor', label: 'Mejor jugada', short: 'Mejor', symbol: '★',
    color: '#16a34a', isPositive: true, isMistake: false,
  },
  precisa: {
    id: 'precisa', label: 'Precisa', short: 'Precisa', symbol: '✓',
    color: '#22c55e', isPositive: true, isMistake: false,
  },
  buena: {
    id: 'buena', label: 'Buena', short: 'Buena', symbol: '○',
    color: '#65a30d', isPositive: true, isMistake: false,
  },
  oportunidad_perdida: {
    id: 'oportunidad_perdida', label: 'Oportunidad perdida', short: 'Oportunidad', symbol: '?!',
    color: '#d97706', isPositive: false, isMistake: true,
  },
  imprecision: {
    id: 'imprecision', label: 'Imprecisión', short: 'Imprecisión', symbol: '?!',
    color: '#eab308', isPositive: false, isMistake: true,
  },
  error: {
    id: 'error', label: 'Error', short: 'Error', symbol: '?',
    color: '#f97316', isPositive: false, isMistake: true,
  },
  error_grave: {
    id: 'error_grave', label: 'Error grave', short: 'Error grave', symbol: '??',
    color: '#dc2626', isPositive: false, isMistake: true,
  },
};

export interface ClassificationThresholds {
  /** Pérdida máxima (cp efectivos) para "Precisa". */
  preciseMaxCp: number;
  /** Pérdida máxima (cp efectivos) para "Buena". */
  goodMaxCp: number;
  /** Pérdida máxima (cp efectivos) para "Imprecisión" (por encima pasa a "Error"). */
  inaccuracyMaxCp: number;
  /** Pérdida máxima (cp efectivos) para "Error" (por encima pasa a "Error grave"). */
  mistakeMaxCp: number;
  /** Margen en cp dentro del cual dos alternativas se consideran prácticamente igual de buenas. */
  equalMoveMarginCp: number;
}

export const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  preciseMaxCp: 18,
  goodMaxCp: 45,
  inaccuracyMaxCp: 95,
  mistakeMaxCp: 220,
  equalMoveMarginCp: 18,
};

/** Probabilidad estimada de victoria [0..1] a partir de centipeones (curva logística). */
export function winProbability(cp: number): number {
  const clamped = Math.max(-4000, Math.min(4000, cp));
  return 1 / (1 + Math.exp(-0.00368208 * clamped));
}

/**
 * Pérdida efectiva en centipeones: pondera la pérdida bruta por el cambio real en la
 * expectativa de resultado, para no inflar caídas irrelevantes en posiciones ya ganadas
 * (p. ej. de +8.00 a +5.50) ni subestimar errores en posiciones críticas e igualadas.
 */
export function effectiveCpLoss(cpBefore: number, cpAfter: number): number {
  const rawLoss = Math.max(0, cpBefore - cpAfter);
  if (rawLoss === 0) return 0;
  const wpBefore = winProbability(cpBefore);
  const wpAfter = winProbability(cpAfter);
  const wpDrop = Math.max(0, wpBefore - wpAfter);
  // En una posición igualada (0 cp), 100 cp de pérdida equivalen a ~0.091 de caída en wp.
  const wpEquivalentCp = (wpDrop / 0.091) * 100;
  // Si el jugador sigue claramente ganado (> +350 cp) y antes también lo estaba, manda la expectativa.
  if (cpBefore >= 350 && cpAfter >= 300) {
    return Math.round(Math.min(rawLoss, wpEquivalentCp));
  }
  // En posiciones normales combinamos ambas métricas.
  return Math.round(rawLoss * 0.45 + wpEquivalentCp * 0.55);
}

export interface ClassifyInput {
  mover: Color;
  playedUci: string;
  scoreBefore: Score;
  scoreAfter: Score;
  /** Líneas MultiPV calculadas en la posición ANTES de mover. */
  linesBefore: PvLine[];
  thresholds?: ClassificationThresholds;
}

export interface ClassificationResult {
  category: MoveCategory;
  meta: CategoryMeta;
  /** Pérdida bruta en centipeones (acotada a [0..1500] para estadísticas). */
  cpLoss: number;
  /** Pérdida efectiva ponderada por el contexto de la posición. */
  effectiveLossCp: number;
  /** Precisión de la jugada en escala 0–100 %. */
  moveAccuracy: number;
  /** Jugadas de la posición previa con evaluación casi idéntica a la mejor. */
  equallyGoodUcis: string[];
  isTopEngineMove: boolean;
}

export function classifyMove(input: ClassifyInput): ClassificationResult {
  const th = input.thresholds ?? DEFAULT_THRESHOLDS;
  const { mover, playedUci, scoreBefore, scoreAfter, linesBefore } = input;
  const opp: Color = mover === 'w' ? 'b' : 'w';

  const cpBefore = Math.max(-1500, Math.min(1500, cpFor(scoreBefore, mover)));
  const cpAfter = Math.max(-1500, Math.min(1500, cpFor(scoreAfter, mover)));
  const rawLoss = Math.max(0, cpBefore - cpAfter);
  const effLoss = effectiveCpLoss(cpBefore, cpAfter);

  const topLine = linesBefore[0];
  const secondLine = linesBefore[1];
  const bestUci = topLine?.pv[0] ?? null;
  const isTopEngineMove = bestUci === playedUci;

  // Detectar jugadas prácticamente equivalentes en el MultiPV previo.
  const equallyGoodUcis: string[] = [];
  if (topLine) {
    const topCp = cpFor(topLine.score, mover);
    for (const l of linesBefore) {
      const u = l.pv[0];
      if (!u) continue;
      if (Math.abs(topCp - cpFor(l.score, mover)) <= th.equalMoveMarginCp) {
        equallyGoodUcis.push(u);
      }
    }
  }
  const playedIsEquallyGood = equallyGoodUcis.includes(playedUci);

  const hadMateForMe = isMateFor(scoreBefore, mover);
  const stillMateForMe = isMateFor(scoreAfter, mover);
  const allowedMateAgainstMe = !isMateFor(scoreBefore, opp) && isMateFor(scoreAfter, opp);

  let category: MoveCategory;

  if (allowedMateAgainstMe) {
    category = 'error_grave';
  } else if (hadMateForMe && !stillMateForMe) {
    // Tenía mate forzado y lo dejó escapar: si aún queda con ventaja o igualdad es oportunidad perdida;
    // si además queda perdido es error grave.
    category = cpAfter >= -40 ? 'oportunidad_perdida' : 'error_grave';
  } else if (isTopEngineMove || (playedIsEquallyGood && rawLoss <= th.equalMoveMarginCp)) {
    // ¿Es una " jugada excelente" (única jugada que sostiene o gana en una posición crítica)?
    const gapToSecond =
      topLine && secondLine
        ? cpFor(topLine.score, mover) - cpFor(secondLine.score, mover)
        : 0;
    if (isTopEngineMove && gapToSecond >= 110 && cpAfter >= -60) {
      category = 'excelente';
    } else if (isTopEngineMove || rawLoss <= 5) {
      category = 'mejor';
    } else {
      category = 'precisa';
    }
  } else if (effLoss <= th.preciseMaxCp || rawLoss <= th.preciseMaxCp) {
    category = 'precisa';
  } else if (effLoss <= th.goodMaxCp) {
    category = 'buena';
  } else {
    // ¿Fue una oportunidad táctica clara desaprovechada?
    // El motor veía una jugada que daba una ventaja mucho mayor (+170 cp sobre la 2ª o sobre
    // la jugada realizada), pero tras la jugada del usuario la posición sigue siendo jugable
    // o ventajosa (no regaló la partida desde la igualdad).
    const missedWinningJump =
      cpBefore >= 170 &&
      cpAfter >= -35 &&
      cpBefore - cpAfter >= 140 &&
      (!secondLine || cpBefore - cpFor(secondLine.score, mover) >= 90);

    if (missedWinningJump && effLoss <= th.mistakeMaxCp + 40) {
      category = 'oportunidad_perdida';
    } else if (effLoss <= th.inaccuracyMaxCp) {
      category = 'imprecision';
    } else if (effLoss <= th.mistakeMaxCp) {
      category = 'error';
    } else {
      category = 'error_grave';
    }
  }

  // Precisión de la jugada (0–100) basada en la caída de probabilidad de victoria.
  const wpDrop = Math.max(0, winProbability(cpBefore) - winProbability(cpAfter));
  const moveAccuracy = Math.max(0, Math.min(100, Math.round(103.1668 * Math.exp(-4.354 * wpDrop) - 3.1668)));

  return {
    category,
    meta: CATEGORIES[category],
    cpLoss: Math.round(rawLoss),
    effectiveLossCp: effLoss,
    moveAccuracy,
    equallyGoodUcis,
    isTopEngineMove,
  };
}

