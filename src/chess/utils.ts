/**
 * Utilidades de ajedrez sobre chess.js.
 * chess.js es la ÚNICA fuente de verdad para la legalidad de las jugadas; el motor solo
 * evalúa su calidad. Son responsabilidades separadas.
 */
import { Chess, type Move, type Square, type PieceSymbol } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type Color = 'w' | 'b';
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey',
};

const PIECE_ARTICLE: Record<PieceSymbol, string> = { p: 'el', n: 'el', b: 'el', r: 'la', q: 'la', k: 'el' };

/** "el caballo de f3", "la torre de a1" */
export function pieceAt(type: PieceSymbol, sq: string): string {
  return `${PIECE_ARTICLE[type]} ${PIECE_NAME[type]} de ${sq}`;
}
export function pieceWithArticle(type: PieceSymbol): string {
  return `${PIECE_ARTICLE[type]} ${PIECE_NAME[type]}`;
}

export const COLOR_NAME: Record<Color, string> = { w: 'blancas', b: 'negras' };

export interface UciMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

export function parseUci(uci: string): UciMove {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci.length > 4 ? uci[4] : undefined) as PieceSymbol | undefined,
  };
}

export function moveToUci(m: { from: string; to: string; promotion?: string }): string {
  return m.from + m.to + (m.promotion ?? '');
}

/** Aplica una jugada UCI de forma segura. Devuelve null si es ilegal (nunca lanza). */
export function tryMove(chess: Chess, uci: string): Move | null {
  try {
    return chess.move(parseUci(uci));
  } catch {
    return null;
  }
}

/** Convierte una variante UCI a SAN. Se detiene en la primera jugada ilegal. */
export function pvToSan(fen: string, pv: string[], max = 99): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    const m = tryMove(chess, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

export function uciToSan(fen: string, uci: string): string {
  return pvToSan(fen, [uci], 1)[0] ?? uci;
}

/** Notación española: C (caballo), A (alfil), T (torre), D (dama), R (rey). */
export function localizeSan(san: string, notation: 'es' | 'en' = 'es'): string {
  if (notation === 'en') return san;
  return san.replace(/[NBRQK]/g, (c) => ({ N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' }[c] as string));
}

/** Formatea una variante con números de jugada: "15...Cxe4 16.Dxe4 Ad5". */
export function formatLine(fen: string, sans: string[], notation: 'es' | 'en' = 'es'): string {
  const parts = fen.split(' ');
  let moveNo = parseInt(parts[5] ?? '1', 10) || 1;
  let white = parts[1] !== 'b';
  const out: string[] = [];
  sans.forEach((s, i) => {
    const ls = localizeSan(s, notation);
    if (white) out.push(`${moveNo}.${ls}`);
    else out.push(i === 0 ? `${moveNo}...${ls}` : ls);
    if (!white) moveNo++;
    white = !white;
  });
  return out.join(' ');
}

/** Número de jugada y prefijo ("12." o "12...") de la jugada que se hará en `fen`. */
export function movePrefix(fen: string): string {
  const parts = fen.split(' ');
  const n = parts[5] ?? '1';
  return parts[1] === 'b' ? `${n}...` : `${n}.`;
}

/** Mapa de destinos legales para el tablero (chessground). */
export function legalDests(chess: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>();
  for (const m of chess.moves({ verbose: true })) {
    const arr = dests.get(m.from) ?? [];
    if (!arr.includes(m.to)) arr.push(m.to);
    dests.set(m.from, arr);
  }
  return dests;
}

/** ¿La jugada from→to es una promoción de peón? */
export function isPromotion(chess: Chess, from: Square, to: Square): boolean {
  const p = chess.get(from);
  if (!p || p.type !== 'p') return false;
  return (p.color === 'w' && to[1] === '8') || (p.color === 'b' && to[1] === '1');
}

/** Material de cada bando en puntos (P=1, C=A=3, T=5, D=9). */
export function material(chess: Chess): { w: number; b: number } {
  const m = { w: 0, b: 0 };
  for (const row of chess.board()) for (const sq of row) if (sq) m[sq.color] += PIECE_VALUE[sq.type];
  return m;
}

/** Balance de material desde el punto de vista de `color`. */
export function materialBalance(chess: Chess, color: Color): number {
  const m = material(chess);
  return color === 'w' ? m.w - m.b : m.b - m.w;
}

/** Normaliza un FEN quitando contadores (para comparar posiciones). */
export function fenKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient'
  | 'threefold'
  | 'fifty'
  | 'resign'
  | 'timeout'
  | 'agreement';

export interface GameOverInfo {
  over: boolean;
  reason?: GameOverReason;
  winner?: Color | null;
  description?: string;
}

export const REASON_TEXT: Record<GameOverReason, string> = {
  checkmate: 'Jaque mate',
  stalemate: 'Tablas por ahogado',
  insufficient: 'Tablas por material insuficiente',
  threefold: 'Tablas por triple repetición',
  fifty: 'Tablas por la regla de las 50 jugadas',
  resign: 'Abandono',
  timeout: 'Tiempo agotado',
  agreement: 'Tablas por acuerdo',
};

/** Detecta el final de la partida según las reglas oficiales. */
export function detectGameOver(chess: Chess): GameOverInfo {
  if (chess.isCheckmate()) {
    const winner = other(chess.turn());
    return { over: true, reason: 'checkmate', winner, description: `Jaque mate. Ganan las ${COLOR_NAME[winner]}.` };
  }
  if (chess.isStalemate()) return { over: true, reason: 'stalemate', winner: null, description: REASON_TEXT.stalemate };
  if (chess.isInsufficientMaterial()) return { over: true, reason: 'insufficient', winner: null, description: REASON_TEXT.insufficient };
  if (chess.isThreefoldRepetition()) return { over: true, reason: 'threefold', winner: null, description: REASON_TEXT.threefold };
  if (chess.isDrawByFiftyMoves()) return { over: true, reason: 'fifty', winner: null, description: REASON_TEXT.fifty };
  return { over: false };
}

export function resultString(winner: Color | null | undefined): '1-0' | '0-1' | '1/2-1/2' {
  if (winner === 'w') return '1-0';
  if (winner === 'b') return '0-1';
  return '1/2-1/2';
}

/** Reconstruye un Chess a partir de FEN inicial + jugadas UCI. */
export function replay(startFen: string, uciMoves: string[]): Chess {
  const chess = new Chess(startFen);
  for (const u of uciMoves) {
    if (!tryMove(chess, u)) throw new Error(`Jugada ilegal en la reconstrucción: ${u}`);
  }
  return chess;
}

export function validateFenSafe(fen: string): { ok: boolean; error?: string } {
  try {
    const c = new Chess(fen);
    const stm = c.turn();
    const opp = other(stm);
    const oppKings = c.findPiece({ type: 'k', color: opp });
    const stmKings = c.findPiece({ type: 'k', color: stm });
    if (oppKings.length !== 1 || stmKings.length !== 1) {
      return { ok: false, error: 'La posición debe tener exactamente un rey por bando.' };
    }
    if (c.isAttacked(oppKings[0], stm)) {
      return { ok: false, error: 'Posición ilegal: el bando que tiene el turno ya captura al rey rival.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

