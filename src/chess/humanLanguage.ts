/**
 * Traductor de jugadas y explicaciones a lenguaje humano natural (sin necesidad de saber
 * coordenadas algebraicas como "Cf3", "Axf7+" o "e4").
 *
 * Describe cada pieza con su icono, su posición visual en la pantalla (arriba/abajo/izquierda/
 * centro/derecha según la orientación del jugador) y qué hace la jugada en palabras cotidianas.
 */
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { type Color, parseUci, tryMove } from './utils';

export interface HumanMoveDescription {
  uci: string;
  from: Square;
  to: Square;
  pieceType: PieceSymbol;
  pieceIcon: string;
  pieceName: string;
  /** Descripción 100% libre de coordenadas: ej. "Sacar tu Caballo de abajo a la derecha hacia el centro" */
  naturalSummary: string;
  /** Descripción paso a paso de dónde está la pieza en la pantalla */
  visualGuide: string;
  /** Si captura algo, qué pieza captura */
  capturedPieceName?: string;
  isCheck: boolean;
  isCastle: boolean;
}

const PIECE_ICONS: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const PIECE_TITLE: Record<PieceSymbol, string> = {
  p: 'Peón',
  n: 'Caballo',
  b: 'Alfil',
  r: 'Torre',
  q: 'Dama (Reina)',
  k: 'Rey',
};

/**
 * Describe en qué zona visual del tablero está una casilla vista desde la orientación del jugador
 * (sin mencionar letras ni números).
 */
export function describeSquareVisually(sq: Square, orientation: Color = 'w'): string {
  const fileIdx = 'abcdefgh'.indexOf(sq[0]); // 0..7
  const rankIdx = parseInt(sq[1], 10) - 1; // 0..7

  // Coordenadas relativas a la pantalla del usuario (screenX: 0=izq..7=der, screenY: 0=abajo..7=arriba)
  const screenX = orientation === 'w' ? fileIdx : 7 - fileIdx;
  const screenY = orientation === 'w' ? rankIdx : 7 - rankIdx;

  let horizontal: string;
  if (screenX <= 1) horizontal = 'del lado izquierdo';
  else if (screenX === 2) horizontal = 'del centro-izquierda';
  else if (screenX === 3 || screenX === 4) horizontal = 'del centro';
  else if (screenX === 5) horizontal = 'del centro-derecha';
  else horizontal = 'del lado derecho';

  let vertical: string;
  if (screenY === 0) vertical = 'en tu primera fila de abajo';
  else if (screenY === 1) vertical = 'en tu fila de peones (abajo)';
  else if (screenY === 2) vertical = 'en la parte media-baja';
  else if (screenY === 3 || screenY === 4) vertical = 'en pleno centro del tablero';
  else if (screenY === 5) vertical = 'avanzando hacia el campo rival';
  else if (screenY === 6) vertical = 'en la fila de peones del rival (arriba)';
  else vertical = 'en la última fila del rival (arriba del todo)';

  if (( sq === 'd4' || sq === 'e4' || sq === 'd5' || sq === 'e5')) {
    return `en el corazón del centro (${horizontal})`;
  }
  return `${vertical}, ${horizontal}`;
}

/**
 * Traduce cualquier movimiento UCI a una explicación visual en español cotidiano,
 * sin necesidad de conocer notación algebraica ni coordenadas.
 */
export function describeMoveNaturally(
  fenBefore: string,
  uci: string,
  orientation: Color = 'w',
): HumanMoveDescription | null {
  try {
    const chess = new Chess(fenBefore);
    const { from, to } = parseUci(uci);
    const movingPiece = chess.get(from);
    if (!movingPiece) return null;

    const targetPiece = chess.get(to);
    const moveObj = tryMove(chess, uci);
    if (!moveObj) return null;

    const icon = PIECE_ICONS[movingPiece.color][movingPiece.type];
    const pName = PIECE_TITLE[movingPiece.type];
    const fromZone = describeSquareVisually(from, orientation);
    const toZone = describeSquareVisually(to, orientation);
    const isCheck = chess.inCheck();

    // Enroques
    if (moveObj.san.startsWith('O-O')) {
      const isShort = moveObj.san === 'O-O';
      return {
        uci,
        from,
        to,
        pieceType: 'k',
        pieceIcon: icon,
        pieceName: 'Rey + Torre',
        naturalSummary: isShort
          ? 'Hacer Enroque corto: llevar tu Rey a un refugio seguro a la derecha y sacar la Torre al centro'
          : 'Hacer Enroque largo: llevar tu Rey a un refugio seguro a la izquierda y activar la Torre',
        visualGuide: `Mueve tu Rey dos casillas hacia la Torre (${fromZone} → ${toZone}).`,
        isCheck,
        isCastle: true,
      };
    }

    const capturedName =
      targetPiece
        ? PIECE_TITLE[targetPiece.type].toLowerCase()
        : moveObj.isEnPassant()
          ? 'peón (al paso)'
          : undefined;

    const checkSuffix = isCheck ? ' ¡dando Jaque al Rey!' : '';

    let naturalSummary: string;
    if (capturedName) {
      naturalSummary = `Usar tu ${pName} (${fromZone}) para capturar el ${capturedName} rival ${toZone}${checkSuffix}`;
    } else if (movingPiece.type === 'p') {
      naturalSummary = `Avanzar tu Peón ${fromZone} hacia delante (${toZone})${checkSuffix}`;
    } else {
      naturalSummary = `Mover tu ${pName} desde ${fromZone} hasta ${toZone}${checkSuffix}`;
    }

    const visualGuide = `Toma tu ${icon} ${pName} que está ${fromZone} y llévalo ${toZone}.`;

    return {
      uci,
      from,
      to,
      pieceType: movingPiece.type,
      pieceIcon: icon,
      pieceName: pName,
      naturalSummary,
      visualGuide,
      capturedPieceName: capturedName,
      isCheck,
      isCastle: false,
    };
  } catch {
    return null;
  }
}

const SAN_LETTER_TO_NAME: Record<string, string> = {
  C: 'Caballo',
  A: 'Alfil',
  T: 'Torre',
  D: 'Dama (Reina)',
  R: 'Rey',
  N: 'Caballo',
  B: 'Alfil',
  Q: 'Dama (Reina)',
  K: 'Rey',
};

function formatDisambiguation(disamb: string): string {
  if (!disamb) return '';
  if (/^[a-d]$/i.test(disamb)) return ` (la de la columna ${disamb.toLowerCase()}, del lado izquierdo)`;
  if (/^[e-h]$/i.test(disamb)) return ` (la de la columna ${disamb.toLowerCase()}, del lado derecho)`;
  if (/^[1-4]$/.test(disamb)) return ` (la de la fila ${disamb}, abajo)`;
  if (/^[5-8]$/.test(disamb)) return ` (la de la fila ${disamb}, arriba)`;
  return ` (la de ${disamb})`;
}

/**
 * Convierte cualquier texto con notación algebraica abreviada (como "Cf3", "Df6", "Tae8", "Axf7+", "O-O", "exd5")
 * en frases descriptivas comprensibles para alguien que no sabe coordenadas ni códigos.
 */
export function humanizeChessText(text: string): string {
  if (!text) return text;

  let out = text;

  // 1. Enroques
  out = out.replace(/\bO-O-O\b/g, 'Enroque largo (proteger al Rey y sacar la Torre)');
  out = out.replace(/\bO-O\b/g, 'Enroque corto (esconder al Rey en la esquina y activar la Torre)');

  // 2. Jugadas de pieza con captura o movimiento y posible desambiguación (ej. Tae8, Df6, Cxd4, Axf7+, T1e2, Dh5+)
  out = out.replace(
    /\b([CATDRNBQK])([a-h1-8]?)(x?)([a-h][1-8])([+#]?)/g,
    (_match, pieceChar: string, disamb: string, cap: string, sq: string, check: string) => {
      const pieceName = SAN_LETTER_TO_NAME[pieceChar] ?? 'pieza';
      const disambText = formatDisambiguation(disamb);
      const action = cap === 'x' ? 'capturando en' : 'moviendo a';
      const chk = check === '#' ? ' con jaque mate' : check === '+' ? ' dando jaque' : '';
      return `${pieceName}${disambText} ${action} ${sq}${chk}`;
    },
  );

  // 3. Capturas de peón tipo exd4, cxd5
  out = out.replace(
    /\b([a-h])x([a-h][1-8])([+#]?)/g,
    (_m, fromFile: string, sq: string, check: string) => {
      const chk = check === '#' ? ' con jaque mate' : check === '+' ? ' dando jaque' : '';
      return `peón de la columna ${fromFile} capturando en ${sq}${chk}`;
    },
  );

  return out;
}

