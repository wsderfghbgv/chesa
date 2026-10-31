/**
 * Tipos y utilidades de puntuación del motor.
 *
 * Convención: TODAS las puntuaciones almacenadas en la app están expresadas
 * desde el punto de vista de las BLANCAS (positivo = ventaja blanca). Stockfish
 * devuelve la puntuación desde el punto de vista del bando que mueve; la
 * normalización se hace en `uci.ts`.
 */
export type Color = 'w' | 'b';

export interface Score {
  kind: 'cp' | 'mate';
  /** cp: centipeones. mate: nº de jugadas hasta el mate (>0 ganan blancas, <0 ganan negras). */
  value: number;
  /** Solo para posiciones ya terminadas en mate (value === 0): bando ganador. */
  winner?: Color;
}

export const MATE_CP = 100000;

/** Convierte una puntuación a centipeones (los mates se convierten en valores enormes y ordenables). */
export function scoreToCp(s: Score): number {
  if (s.kind === 'cp') return s.value;
  if (s.value === 0) return s.winner === 'b' ? -MATE_CP : MATE_CP;
  return Math.sign(s.value) * (MATE_CP - Math.abs(s.value) * 100);
}

/** Puntuación desde la perspectiva de un color concreto (positivo = bueno para ese color). */
export function cpFor(s: Score, color: Color): number {
  const cp = scoreToCp(s);
  return color === 'w' ? cp : -cp;
}

export function isMateScore(s: Score): boolean {
  return s.kind === 'mate';
}

/** Mate a favor del color indicado (incluye mate ya dado). */
export function isMateFor(s: Score, color: Color): boolean {
  if (s.kind !== 'mate') return false;
  if (s.value === 0) return s.winner === color;
  return color === 'w' ? s.value > 0 : s.value < 0;
}

/** Formatea una puntuación para la interfaz, p. ej. "+1.35", "−0.40", "#3", "#−2". */
export function formatScore(s: Score | null | undefined, perspective: Color = 'w'): string {
  if (!s) return '…';
  if (s.kind === 'mate') {
    if (s.value === 0) return s.winner === perspective ? 'Mate (ganado)' : 'Mate (perdido)';
    const v = perspective === 'w' ? s.value : -s.value;
    return v > 0 ? `#${v}` : `#−${Math.abs(v)}`;
  }
  const v = (perspective === 'w' ? s.value : -s.value) / 100;
  const txt = Math.abs(v).toFixed(2);
  if (Math.abs(v) < 0.005) return '0.00';
  return v > 0 ? `+${txt}` : `−${txt}`;
}

/** Descripción en lenguaje natural de una evaluación (para explicaciones de nivel básico). */
export function describeScore(s: Score, perspective: Color): string {
  if (s.kind === 'mate') {
    if (s.value === 0) return s.winner === perspective ? 'jaque mate a tu favor' : 'jaque mate en tu contra';
    const forMe = isMateFor(s, perspective);
    const n = Math.abs(s.value);
    return forMe ? `mate forzado a tu favor en ${n}` : `mate forzado en tu contra en ${n}`;
  }
  const cp = perspective === 'w' ? s.value : -s.value;
  const pawns = Math.abs(cp) / 100;
  if (pawns < 0.3) return 'posición equilibrada';
  const who = cp > 0 ? 'a tu favor' : 'para tu rival';
  if (pawns < 0.8) return `ligera ventaja ${who}`;
  if (pawns < 1.8) return `ventaja clara ${who} (≈ ${pawns.toFixed(1)} peones)`;
  if (pawns < 4) return `ventaja grande ${who} (≈ ${pawns.toFixed(1)} peones)`;
  return `ventaja decisiva ${who}`;
}

