/**
 * Parser del protocolo UCI (Universal Chess Interface).
 * Convierte las líneas de texto de Stockfish en estructuras tipadas.
 */
import type { Color, Score } from './score';

export interface InfoLine {
  depth: number;
  seldepth?: number;
  multipv: number;
  /** Puntuación normalizada al punto de vista de las blancas. */
  score: Score;
  /** true si es una cota (lowerbound/upperbound); esas líneas no son evaluaciones exactas. */
  bound: boolean;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv: string[];
}

/** Bando que mueve según el FEN. */
export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/**
 * Parsea una línea "info ..." de Stockfish. Devuelve null si la línea no contiene
 * una puntuación con variante principal (p. ej. "info string ..." o "info currmove ...").
 * @param stm bando que mueve en la posición analizada (para normalizar la puntuación).
 */
export function parseInfo(line: string, stm: Color): InfoLine | null {
  if (!line.startsWith('info ') || line.startsWith('info string')) return null;
  const t = line.split(/\s+/);
  let depth = -1;
  let seldepth: number | undefined;
  let multipv = 1;
  let scoreKind: 'cp' | 'mate' | null = null;
  let scoreVal = 0;
  let bound = false;
  let nodes: number | undefined;
  let nps: number | undefined;
  let timeMs: number | undefined;
  let pv: string[] = [];
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': depth = parseInt(t[++i], 10); break;
      case 'seldepth': seldepth = parseInt(t[++i], 10); break;
      case 'multipv': multipv = parseInt(t[++i], 10); break;
      case 'score':
        scoreKind = t[++i] === 'mate' ? 'mate' : 'cp';
        scoreVal = parseInt(t[++i], 10);
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') { bound = true; i++; }
        break;
      case 'nodes': nodes = parseInt(t[++i], 10); break;
      case 'nps': nps = parseInt(t[++i], 10); break;
      case 'time': timeMs = parseInt(t[++i], 10); break;
      case 'pv': pv = t.slice(i + 1).filter(Boolean); i = t.length; break;
      default: break;
    }
  }
  if (depth < 0 || scoreKind === null) return null;
  return { depth, seldepth, multipv, score: normalizeScore(scoreKind, scoreVal, stm), bound, nodes, nps, timeMs, pv };
}

/** Pasa una puntuación del punto de vista del bando que mueve al de las blancas. */
export function normalizeScore(kind: 'cp' | 'mate', value: number, stm: Color): Score {
  if (kind === 'mate' && value === 0) {
    // "mate 0": el bando que mueve ya está en jaque mate.
    return { kind: 'mate', value: 0, winner: stm === 'w' ? 'b' : 'w' };
  }
  const v = stm === 'w' ? value : -value;
  return { kind, value: v };
}

export interface BestMoveLine {
  bestmove: string | null;
  ponder?: string;
}

export function parseBestMove(line: string): BestMoveLine | null {
  if (!line.startsWith('bestmove')) return null;
  const t = line.split(/\s+/);
  const bm = t[1];
  return {
    bestmove: !bm || bm === '(none)' || bm === '0000' ? null : bm,
    ponder: t[2] === 'ponder' ? t[3] : undefined,
  };
}

