/**
 * Análisis de características de una posición (geometría del tablero).
 *
 * Estas funciones NO evalúan quién está mejor (eso es tarea exclusiva de Stockfish).
 * Sirven para DESCRIBIR lo que ocurre sobre el tablero —piezas indefensas, clavadas,
 * ataques dobles, seguridad del rey, estructura de peones…— y así poder explicar con
 * palabras los números del motor.
 */
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { PIECE_VALUE, other, type Color } from './utils';

export interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

const FILES = 'abcdefgh';

export function sqToXY(sq: string): [number, number] {
  return [FILES.indexOf(sq[0]), parseInt(sq[1], 10) - 1];
}
export function xyToSq(x: number, y: number): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return `${FILES[x]}${y + 1}` as Square;
}

export function pieces(chess: Chess, color?: Color): BoardPiece[] {
  const out: BoardPiece[] = [];
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && (!color || p.color === color)) out.push({ square: p.square, type: p.type, color: p.color });
    }
  }
  return out;
}

const KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Casillas atacadas por la pieza situada en `sq` (respetando bloqueos, sin considerar clavadas). */
export function attacksFrom(chess: Chess, sq: Square): Square[] {
  const p = chess.get(sq);
  if (!p) return [];
  const [x, y] = sqToXY(sq);
  const out: Square[] = [];
  const add = (dx: number, dy: number) => { const s = xyToSq(x + dx, y + dy); if (s) out.push(s); };
  const slide = (dirs: number[][]) => {
    for (const [dx, dy] of dirs) {
      let cx = x + dx, cy = y + dy;
      while (true) {
        const s = xyToSq(cx, cy);
        if (!s) break;
        out.push(s);
        if (chess.get(s)) break;
        cx += dx; cy += dy;
      }
    }
  };
  switch (p.type) {
    case 'p': { const dy = p.color === 'w' ? 1 : -1; add(-1, dy); add(1, dy); break; }
    case 'n': KNIGHT_D.forEach(([dx, dy]) => add(dx, dy)); break;
    case 'k': KING_D.forEach(([dx, dy]) => add(dx, dy)); break;
    case 'b': slide(BISHOP_D); break;
    case 'r': slide(ROOK_D); break;
    case 'q': slide([...ROOK_D, ...BISHOP_D]); break;
  }
  return out;
}

/** Atacantes de `color` sobre una casilla (incluye defensores si la casilla es propia). */
export function attackersOf(chess: Chess, sq: Square, color: Color): BoardPiece[] {
  const out: BoardPiece[] = [];
  for (const p of pieces(chess, color)) if (attacksFrom(chess, p.square).includes(sq)) out.push(p);
  return out;
}

export interface HangingPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
  attackers: BoardPiece[];
  defenders: BoardPiece[];
  /** Material que se puede ganar capturándola (estimación por intercambio estático). */
  gain: number;
  reason: 'undefended' | 'cheaper-attacker';
}

/**
 * Intercambio estático simplificado (SEE) sobre una casilla: material que gana el bando
 * atacante si inicia las capturas, suponiendo que ambos capturan siempre con la pieza
 * de menor valor y pueden detenerse cuando les conviene.
 */
export function staticExchange(targetValue: number, attackerValues: number[], defenderValues: number[]): number {
  const att = [...attackerValues].sort((a, b) => a - b);
  const def = [...defenderValues].sort((a, b) => a - b);
  if (att.length === 0) return 0;
  const gains: number[] = [];
  let onSquare = targetValue;
  let side = 0; // 0 = atacante, 1 = defensor
  const lists = [att, def];
  let depth = 0;
  gains[0] = 0;
  while (lists[side].length) {
    const capturer = lists[side].shift()!;
    gains[depth + 1] = onSquare - gains[depth];
    onSquare = capturer;
    depth++;
    side = 1 - side;
  }
  // Minimax hacia atrás: cada bando puede negarse a seguir capturando.
  for (let d = depth; d > 1; d--) gains[d - 1] = Math.min(gains[d - 1], -gains[d]) * -1 === 0 ? gains[d - 1] : -Math.max(-gains[d - 1], gains[d]);
  return Math.max(0, gains[1] ?? 0);
}

/** Valor del rey en intercambios: solo puede capturar si la casilla no está defendida. */
const KING_EX = 100;

function exchangeValues(list: BoardPiece[]): number[] {
  return list.map((p) => (p.type === 'k' ? KING_EX : PIECE_VALUE[p.type]));
}

/** Ganancia material simple del atacante en una casilla, considerando defensores. */
export function captureGain(chess: Chess, sq: Square, attackerColor: Color): number {
  const target = chess.get(sq);
  if (!target || target.color === attackerColor) return 0;
  const attackers = attackersOf(chess, sq, attackerColor);
  if (!attackers.length) return 0;
  const defenders = attackersOf(chess, sq, target.color);
  return seeSimple(PIECE_VALUE[target.type], exchangeValues(attackers), exchangeValues(defenders));
}

/** SEE iterativa clásica (lista de ganancias con negamax). */
export function seeSimple(target: number, attackers: number[], defenders: number[]): number {
  const att = [...attackers].sort((a, b) => a - b);
  const def = [...defenders].sort((a, b) => a - b);
  if (!att.length) return 0;
  const gain: number[] = [];
  let d = 0;
  gain[d] = target;
  let last = att.shift()!;
  let side: 'def' | 'att' = 'def';
  while (true) {
    const list = side === 'def' ? def : att;
    if (!list.length) break;
    d++;
    gain[d] = last - gain[d - 1];
    last = list.shift()!;
    side = side === 'def' ? 'att' : 'def';
  }
  while (d > 0) {
    gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
    d--;
  }
  return Math.max(0, Math.min(gain[0], 99));
}

/** Piezas de `color` que el rival puede ganar (sin defensa o atacadas por piezas más baratas). */
export function hangingPieces(chess: Chess, color: Color): HangingPiece[] {
  const opp = other(color);
  const out: HangingPiece[] = [];
  for (const p of pieces(chess, color)) {
    if (p.type === 'k') continue;
    const attackers = attackersOf(chess, p.square, opp);
    if (!attackers.length) continue;
    const defenders = attackersOf(chess, p.square, color);
    const gain = seeSimple(PIECE_VALUE[p.type], exchangeValues(attackers), exchangeValues(defenders));
    if (gain <= 0) continue;
    out.push({
      square: p.square, type: p.type, color, attackers, defenders, gain,
      reason: defenders.length === 0 ? 'undefended' : 'cheaper-attacker',
    });
  }
  return out.sort((a, b) => b.gain - a.gain);
}

export interface Pin {
  pinner: BoardPiece;
  pinned: BoardPiece;
  /** Pieza que queda detrás (rey = clavada absoluta). */
  behind: BoardPiece;
  absolute: boolean;
}

/** Clavadas ejercidas por las piezas de largo alcance de `byColor`. */
export function findPins(chess: Chess, byColor: Color): Pin[] {
  const out: Pin[] = [];
  for (const p of pieces(chess, byColor)) {
    if (!['b', 'r', 'q'].includes(p.type)) continue;
    const dirs = p.type === 'b' ? BISHOP_D : p.type === 'r' ? ROOK_D : [...ROOK_D, ...BISHOP_D];
    const [x, y] = sqToXY(p.square);
    for (const [dx, dy] of dirs) {
      let cx = x + dx, cy = y + dy;
      let first: BoardPiece | null = null;
      while (true) {
        const s = xyToSq(cx, cy);
        if (!s) break;
        const q = chess.get(s);
        if (q) {
          if (!first) {
            if (q.color === byColor) break;
            first = { square: s, type: q.type, color: q.color };
          } else {
            if (q.color !== byColor && (q.type === 'k' || PIECE_VALUE[q.type] > PIECE_VALUE[first.type])) {
              out.push({ pinner: p, pinned: first, behind: { square: s, type: q.type, color: q.color }, absolute: q.type === 'k' });
            }
            break;
          }
        }
        cx += dx; cy += dy;
      }
    }
  }
  return out;
}

export interface ForkInfo {
  attacker: BoardPiece;
  targets: BoardPiece[];
}

/**
 * ¿La pieza en `sq` ataca a la vez dos o más objetivos valiosos? Se consideran objetivos el
 * rey, piezas más valiosas que la atacante o piezas sin defensa.
 */
export function forkFrom(chess: Chess, sq: Square): ForkInfo | null {
  const p = chess.get(sq);
  if (!p) return null;
  const attacker: BoardPiece = { square: sq, type: p.type, color: p.color };
  const targets: BoardPiece[] = [];
  for (const t of attacksFrom(chess, sq)) {
    const q = chess.get(t);
    if (!q || q.color === p.color) continue;
    const valuable = q.type === 'k' || PIECE_VALUE[q.type] > PIECE_VALUE[p.type];
    const undefended = q.type !== 'k' && attackersOf(chess, t, q.color).length === 0;
    if ((valuable || undefended) && q.type !== 'p') targets.push({ square: t, type: q.type, color: q.color });
  }
  return targets.length >= 2 ? { attacker, targets } : null;
}

/** Casilla del rey de un color. */
export function kingSquare(chess: Chess, color: Color): Square | null {
  return pieces(chess, color).find((p) => p.type === 'k')?.square ?? null;
}

export interface KingSafety {
  square: Square | null;
  castled: boolean;
  /** Peones propios delante del rey (3 columnas, 2 filas). */
  shield: number;
  /** Columnas abiertas o semiabiertas junto al rey. */
  openFilesNear: number;
  /** Nº de casillas de la zona del rey atacadas por el rival. */
  zoneAttacks: number;
  canStillCastle: boolean;
}

export function kingSafety(chess: Chess, color: Color): KingSafety {
  const sq = kingSquare(chess, color);
  if (!sq) return { square: null, castled: false, shield: 0, openFilesNear: 0, zoneAttacks: 0, canStillCastle: false };
  const [kx, ky] = sqToXY(sq);
  const dir = color === 'w' ? 1 : -1;
  const homeRank = color === 'w' ? 0 : 7;
  let shield = 0;
  let openFiles = 0;
  for (let dx = -1; dx <= 1; dx++) {
    const fx = kx + dx;
    if (fx < 0 || fx > 7) continue;
    for (let r = 1; r <= 2; r++) {
      const s = xyToSq(fx, ky + dir * r);
      const q = s ? chess.get(s) : undefined;
      if (q && q.type === 'p' && q.color === color) { shield++; break; }
    }
    let ownPawn = false;
    for (let y = 0; y < 8; y++) {
      const q = chess.get(xyToSq(fx, y)!);
      if (q && q.type === 'p' && q.color === color) ownPawn = true;
    }
    if (!ownPawn) openFiles++;
  }
  const opp = other(color);
  let zoneAttacks = 0;
  for (const [dx, dy] of [...KING_D, [0, 0]]) {
    const s = xyToSq(kx + dx, ky + dy);
    if (s && chess.isAttacked(s, opp)) zoneAttacks++;
  }
  const castling = chess.fen().split(' ')[2];
  const canStillCastle = color === 'w' ? /[KQ]/.test(castling) : /[kq]/.test(castling);
  const castled = ky === homeRank && (kx >= 6 || kx <= 2);
  return { square: sq, castled, shield, openFilesNear: openFiles, zoneAttacks, canStillCastle };
}

export interface Development {
  /** Piezas menores todavía en su casilla inicial. */
  undevelopedMinors: number;
  kingMovedWithoutCastling: boolean;
}

export function development(chess: Chess, color: Color): Development {
  const rank = color === 'w' ? '1' : '8';
  const homes: Record<string, PieceSymbol> = { [`b${rank}`]: 'n', [`g${rank}`]: 'n', [`c${rank}`]: 'b', [`f${rank}`]: 'b' };
  let undeveloped = 0;
  for (const [sq, type] of Object.entries(homes)) {
    const q = chess.get(sq as Square);
    if (q && q.type === type && q.color === color) undeveloped++;
  }
  const ks = kingSquare(chess, color);
  const kingMovedWithoutCastling = !!ks && ks !== `e${rank}` && !kingSafety(chess, color).castled;
  return { undevelopedMinors: undeveloped, kingMovedWithoutCastling };
}

const CENTER: Square[] = ['d4', 'e4', 'd5', 'e5'];

/** Control del centro: ocupación (x2) + ataques sobre d4, e4, d5, e5. */
export function centerControl(chess: Chess, color: Color): number {
  let score = 0;
  for (const s of CENTER) {
    const q = chess.get(s);
    if (q && q.color === color) score += 2;
    score += attackersOf(chess, s, color).length;
  }
  return score;
}

export interface PawnStructure {
  doubled: string[];
  isolated: string[];
  passed: Square[];
}

export function pawnStructure(chess: Chess, color: Color): PawnStructure {
  const own: number[][] = Array.from({ length: 8 }, () => []);
  const opp: number[][] = Array.from({ length: 8 }, () => []);
  for (const p of pieces(chess)) {
    if (p.type !== 'p') continue;
    const [x, y] = sqToXY(p.square);
    (p.color === color ? own : opp)[x].push(y);
  }
  const doubled: string[] = [];
  const isolated: string[] = [];
  const passed: Square[] = [];
  for (let x = 0; x < 8; x++) {
    if (own[x].length > 1) doubled.push(FILES[x]);
    if (own[x].length && !(own[x - 1]?.length) && !(own[x + 1]?.length)) isolated.push(FILES[x]);
    for (const y of own[x]) {
      const ahead = (oy: number) => (color === 'w' ? oy > y : oy < y);
      const blocked = [x - 1, x, x + 1].some((fx) => fx >= 0 && fx < 8 && opp[fx].some(ahead));
      if (!blocked) passed.push(xyToSq(x, y)!);
    }
  }
  return { doubled, isolated, passed };
}

/** Movilidad: nº de jugadas pseudo-legales de un bando (se cambia el turno si hace falta). */
export function mobility(chess: Chess, color: Color): number {
  if (chess.turn() === color) return chess.moves().length;
  const parts = chess.fen().split(' ');
  parts[1] = color;
  parts[3] = '-';
  try {
    const c = new Chess(parts.join(' '), { skipValidation: true });
    return c.moves().length;
  } catch {
    return 0;
  }
}

export type Phase = 'apertura' | 'medio juego' | 'final';

/** Fase de la partida según material no-peón y número de jugada. */
export function gamePhase(chess: Chess): Phase {
  let nonPawn = 0;
  let queens = 0;
  for (const p of pieces(chess)) {
    if (p.type === 'q') queens++;
    if (p.type !== 'p' && p.type !== 'k') nonPawn += PIECE_VALUE[p.type];
  }
  const moveNo = parseInt(chess.fen().split(' ')[5] ?? '1', 10);
  if (nonPawn <= 26 || (queens === 0 && nonPawn <= 32)) return 'final';
  if (moveNo <= 12 && nonPawn >= 54) return 'apertura';
  return 'medio juego';
}

/**
 * Amenazas inmediatas del bando `color` si le tocara mover: capturas que ganan material
 * y mates en una jugada. Se usa para explicar "qué amenazaba tu rival".
 */
export interface Threat {
  uci: string;
  san: string;
  kind: 'mate' | 'capture';
  gain: number;
  target?: BoardPiece;
}

export function threatsOf(chess: Chess, color: Color): Threat[] {
  let c: Chess;
  if (chess.turn() === color) c = new Chess(chess.fen());
  else {
    if (chess.inCheck()) return [];
    const parts = chess.fen().split(' ');
    parts[1] = color;
    parts[3] = '-';
    try { c = new Chess(parts.join(' '), { skipValidation: true }); } catch { return []; }
  }
  const out: Threat[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (m.captured) {
      const gain = captureGain(c, m.to, color);
      if (gain > 0) {
        out.push({ uci: m.from + m.to + (m.promotion ?? ''), san: m.san, kind: 'capture', gain, target: { square: m.to, type: m.captured, color: other(color) } });
      }
    }
    if (m.san.endsWith('#')) out.push({ uci: m.from + m.to + (m.promotion ?? ''), san: m.san, kind: 'mate', gain: 100 });
  }
  // Deduplicar por casilla objetivo y quedarse con la mejor.
  const best = new Map<string, Threat>();
  for (const t of out) {
    const k = t.kind === 'mate' ? `mate-${t.uci}` : t.target!.square;
    if (!best.has(k) || best.get(k)!.gain < t.gain) best.set(k, t);
  }
  return [...best.values()].sort((a, b) => b.gain - a.gain);
}

/** Piezas de largo alcance que quedan "descubiertas" al mover desde `from`. */
export function discoveredAttacks(before: Chess, after: Chess, from: Square, color: Color): Array<{ slider: BoardPiece; target: BoardPiece }> {
  const out: Array<{ slider: BoardPiece; target: BoardPiece }> = [];
  for (const p of pieces(after, color)) {
    if (!['b', 'r', 'q'].includes(p.type) || p.square === from) continue;
    const prev = new Set(attacksFrom(before, p.square));
    for (const t of attacksFrom(after, p.square)) {
      if (prev.has(t)) continue;
      const q = after.get(t);
      if (q && q.color !== color && (q.type === 'k' || PIECE_VALUE[q.type] >= 3)) {
        out.push({ slider: p, target: { square: t, type: q.type, color: q.color } });
      }
    }
  }
  return out;
}

