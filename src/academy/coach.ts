/**
 * Entrenador IA conversacional de Aperturas y Sistema de Preguntas y Respuestas sobre Posiciones.
 *
 * REGLAS DE PRECISIÓN:
 * 1) Jamás inventa jugadas, variantes ni evaluaciones.
 * 2) Valida toda jugada con chess.js y obtiene las evaluaciones y líneas tácticas de Stockfish (`engine.ts`).
 * 3) Diferencia explícitamente entre la evaluación objetiva del motor (`engineFact`) y la explicación
 *    estratégica/pedagógica (`strategicExplanation`).
 * 4) Devuelve flechas, casillas resaltadas y variantes para ilustrar las respuestas directamente en el tablero.
 */
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import {
  attackersOf,
  attacksFrom,
  centerControl,
  development,
  findPins,
  hangingPieces,
  kingSafety,
  mobility,
  pawnStructure,
  pieces,
  threatsOf,
} from '../chess/features';
import {
  COLOR_NAME,
  PIECE_NAME,
  PIECE_VALUE,
  formatLine,
  localizeSan,
  moveToUci,
  other,
  pieceAt,
  pvToSan,
  uciToSan,
  type Color,
} from '../chess/utils';
import { describeScore, formatScore } from '../engine/score';
import { VERDICT_LABEL, analyzePosition, judgeMove } from './engine';
import { buildTree, followUci, orderedChildren } from './tree';
import type { Arrow, CompiledLine, CompiledMove, CompiledOpening, Level } from './types';

export interface OpeningCoachContext {
  opening: CompiledOpening;
  line: CompiledLine;
  fen: string;
  pgn: string;
  uciHistory: string[];
  ply: number;
  userColor: Color;
  level: Level;
  currentMove?: CompiledMove | null;
  selectedSquare?: Square | null;
}

export interface OpeningCoachAnswer {
  id: string;
  question: string;
  headline: string;
  /** Bloque explícito de validación del motor Stockfish (nunca inventado). */
  engineFact: {
    scoreText: string;
    scoreDescription: string;
    bestMoveSanEs: string;
    bestMoveUci: string;
    principalVariationEs: string;
    depth: number;
    comparedMove?: {
      playedSanEs: string;
      scoreText: string;
      lossCp: number;
      verdictLabel: string;
      lineEs: string;
    };
  };
  /** Explicación estratégica y pedagógica adaptada al nivel del usuario y a la apertura. */
  strategicExplanation: string;
  /** Puntos clave resumidos para lectura rápida. */
  bulletPoints: string[];
  /** Texto preparado para síntesis de voz del Profesor Virtual. */
  spokenText: string;
  /** Ilustración visual sobre el tablero (flechas, casillas importantes y amenazas). */
  illustration: {
    arrows: Arrow[];
    highlights: Square[];
    threatened: Square[];
    variantSanEs?: string[];
  };
  fromCache: boolean;
}

export interface SquareInspection {
  square: Square;
  piece: { type: PieceSymbol; color: Color; label: string } | null;
  keySquareRole: string | null;
  controlledSquares: Square[];
  whiteAttackers: string[];
  blackAttackers: string[];
  legalMovesFromHere: Array<{ uci: string; sanEs: string; to: Square; isBook: boolean }>;
  legalMovesToHere: Array<{ uci: string; sanEs: string; from: Square; isBook: boolean }>;
  summary: string;
  arrows: Arrow[];
  highlights: Square[];
}

export const OPENING_COACH_QUICK_QUESTIONS: Array<{ id: string; label: string; prompt: string }> = [
  { id: 'why-best', label: '¿Por qué es la mejor jugada?', prompt: '¿Por qué este movimiento es el mejor en esta posición?' },
  { id: 'plan-white', label: 'Plan de las blancas', prompt: '¿Cuál es el plan estratégico de las blancas en esta apertura?' },
  { id: 'plan-black', label: 'Plan de las negras', prompt: '¿Cuál es el plan de las negras y qué buscan conseguir?' },
  { id: 'threats', label: '¿Qué amenazas existen?', prompt: '¿Qué amenazas tácticas existen ahora mismo en el tablero?' },
  { id: 'worst-piece', label: '¿Qué pieza está peor ubicada?', prompt: '¿Qué pieza está peor ubicada y cómo puedo desarrollar o mejorar mi posición?' },
  { id: 'alternatives', label: '¿Qué pasa si el rival juega otra cosa?', prompt: '¿Qué pasa si mi rival juega otra variante en esta posición?' },
  { id: 'mistakes', label: '¿Qué errores debo evitar?', prompt: '¿Qué errores frecuentes y trampas debo vigilar en esta apertura?' },
  { id: 'eval-pos', label: '¿Esta posición es buena para mí?', prompt: '¿Esta posición es buena para mí y quién tiene ventaja?' },
];

const answerCache = new Map<string, OpeningCoachAnswer>();
const MAX_ANSWER_CACHE = 200;

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Intenta detectar si el usuario pregunta por un movimiento legal concreto en la posición actual
 * (ej. "¿Por qué no puedo mover la dama a h5?", "¿Qué sucede si intercambio cxd5?", "¿Y si juego Ac4?").
 */
export function detectCandidateMoveInQuestion(fen: string, question: string): Move | null {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;

  const qRaw = question.trim();
  const qNorm = normalizeText(qRaw);

  // 1) Coincidencia directa con SAN en español o inglés (p. ej. "Dh5", "cxd5", "Ac4", "Nf3", "O-O")
  for (const mv of legal) {
    const sanEn = mv.san.replace(/[+#!?]/g, '');
    const sanEs = localizeSan(sanEn, 'es');
    const regexEs = new RegExp(`(^|[\\s¿?¡!(,"'])${sanEs.replace(/[+]/g, '\\+')}(?=$|[\\s?!.,)"'])`, 'i');
    const regexEn = new RegExp(`(^|[\\s¿?¡!(,"'])${sanEn.replace(/[+]/g, '\\+')}(?=$|[\\s?!.,)"'])`, 'i');
    if (sanEs.length >= 2 && (regexEs.test(qRaw) || regexEn.test(qRaw))) {
      return mv;
    }
  }

  // 2) Coincidencia por nombre de pieza + casilla destino (p. ej. "mover la dama a h5", "caballo en f3")
  const sqMatch = qNorm.match(/\b([a-h][1-8])\b/);
  const pieceMap: Array<{ words: string[]; piece: PieceSymbol }> = [
    { words: ['dama', 'reina'], piece: 'q' },
    { words: ['caballo'], piece: 'n' },
    { words: ['alfil'], piece: 'b' },
    { words: ['torre'], piece: 'r' },
    { words: ['rey'], piece: 'k' },
    { words: ['peon'], piece: 'p' },
  ];
  const mentionedPiece = pieceMap.find((pm) => pm.words.some((w) => qNorm.includes(w)));

  if (sqMatch) {
    const targetSq = sqMatch[1] as Square;
    if (mentionedPiece) {
      const found = legal.find((m) => m.piece === mentionedPiece.piece && m.to === targetSq);
      if (found) return found;
    }
    const anyToTarget = legal.find((m) => m.to === targetSq);
    if (anyToTarget) return anyToTarget;
  }

  // 3) "¿Qué sucede si intercambio estos dos peones?" -> buscar captura de peón legal
  if (qNorm.includes('intercambi') || qNorm.includes('cambio') || qNorm.includes('capturo')) {
    const pawnCap = legal.find((m) => m.piece === 'p' && m.captured === 'p');
    if (pawnCap) return pawnCap;
    const anyCap = legal.find((m) => Boolean(m.captured));
    if (anyCap) return anyCap;
  }

  // 4) Si menciona solo una pieza ("¿por qué no puedo mover la dama?")
  if (mentionedPiece && (qNorm.includes('mover') || qNorm.includes('jugar') || qNorm.includes('sacar'))) {
    const first = legal.find((m) => m.piece === mentionedPiece.piece);
    if (first) return first;
  }

  return null;
}

/**
 * Encuentra la pieza propia peor ubicada (en su casilla inicial o con menor movilidad)
 * y sugiere su mejor casilla de desarrollo según la apertura y las jugadas legales.
 */
export function findWorstPlacedPiece(chess: Chess, color: Color, opening: CompiledOpening): {
  pieceDesc: string;
  square: Square;
  reason: string;
  suggestedMove: Move | null;
} | null {
  const myPieces = pieces(chess, color).filter((p) => p.type !== 'p' && p.type !== 'k');
  if (!myPieces.length) return null;

  const homeRank = color === 'w' ? '1' : '8';
  const legal = chess.turn() === color ? chess.moves({ verbose: true }) : [];

  // Priorizar piezas menores aún en la primera fila
  const undeveloped = myPieces.filter((p) => (p.type === 'n' || p.type === 'b') && p.square[1] === homeRank);
  const scored = (undeveloped.length ? undeveloped : myPieces).map((p) => {
    const att = attacksFrom(chess, p.square).length;
    const homePenalty = p.square[1] === homeRank ? -10 : 0;
    return { p, score: att + homePenalty };
  });
  scored.sort((a, b) => a.score - b.score);
  const worst = scored[0]?.p;
  if (!worst) return null;

  const movesFromWorst = legal.filter((m) => m.from === worst.square);
  // Preferir una jugada que vaya hacia el centro
  const centerSet = new Set(['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5', 'c3', 'f3', 'c6', 'f6', 'g2', 'b2', 'g7', 'b7']);
  const suggested =
    movesFromWorst.find((m) => centerSet.has(m.to)) ??
    movesFromWorst[0] ??
    null;

  const devIdea = opening.development.find((d) =>
    normalizeText(d.piece).includes(PIECE_NAME[worst.type]),
  );

  const reason =
    worst.square[1] === homeRank
      ? `Sigue en su casilla inicial (${worst.square}) sin participar en la lucha por el centro${devIdea ? `. En la ${opening.short ?? opening.name}, su plan ideal es: ${devIdea.idea}` : ''}.`
      : `Desde ${worst.square} apenas controla ${attacksFrom(chess, worst.square).length} casilla(s)${devIdea ? `. Recuerda su función ideal en esta apertura: ${devIdea.idea}` : ''}.`;

  return {
    pieceDesc: pieceAt(worst.type, worst.square),
    square: worst.square,
    reason,
    suggestedMove: suggested,
  };
}

/**
 * Inspecciona cualquier casilla o pieza del tablero (Requisito 7).
 */
export function inspectSquareOrPiece(
  fen: string,
  square: Square,
  opening: CompiledOpening,
): SquareInspection {
  const chess = new Chess(fen);
  const occ = chess.get(square);
  const tree = buildTree(opening);

  // Buscar jugadas de libro en esta posición
  let bookUcis = new Set<string>();
  for (const line of opening.compiled) {
    const idx = line.fens.findIndex((f) => f.split(' ').slice(0, 4).join(' ') === fen.split(' ').slice(0, 4).join(' '));
    if (idx >= 0 && line.moves[idx]) {
      bookUcis.add(line.moves[idx].uci);
    }
  }
  void tree;

  const wAtt = attackersOf(chess, square, 'w').map((p) => `${PIECE_NAME[p.type]} (${p.square})`);
  const bAtt = attackersOf(chess, square, 'b').map((p) => `${PIECE_NAME[p.type]} (${p.square})`);
  const controlled = occ ? attacksFrom(chess, square) : [];
  const keyRole = opening.keySquares.find((k) => k.square === square)?.role ?? null;

  const legal = chess.moves({ verbose: true });
  const fromHere = legal
    .filter((m) => m.from === square)
    .map((m) => ({
      uci: moveToUci(m),
      sanEs: localizeSan(m.san, 'es'),
      to: m.to,
      isBook: bookUcis.has(moveToUci(m)),
    }));
  const toHere = legal
    .filter((m) => m.to === square)
    .map((m) => ({
      uci: moveToUci(m),
      sanEs: localizeSan(m.san, 'es'),
      from: m.from,
      isBook: bookUcis.has(moveToUci(m)),
    }));

  const arrows: Arrow[] = [];
  const highlights: Square[] = [square];

  for (const sq of controlled.slice(0, 4)) {
    arrows.push({ orig: square, dest: sq, brush: 'blue' });
  }
  for (const m of fromHere.filter((x) => x.isBook)) {
    arrows.unshift({ orig: square, dest: m.to, brush: 'green' });
  }

  const parts: string[] = [];
  if (occ) {
    parts.push(`En ${square} se encuentra ${pieceAt(occ.type, square)} de las ${COLOR_NAME[occ.color]}.`);
    if (controlled.length) {
      parts.push(`Desde aquí ataca o vigila las casillas: ${controlled.join(', ')}.`);
    }
  } else {
    parts.push(`La casilla ${square} está actualmente libre.`);
  }
  if (keyRole) {
    parts.push(`Casilla temática en ${opening.short ?? opening.name}: ${keyRole}`);
  }
  parts.push(
    `Control de ${square}: Blancas (${wAtt.length ? wAtt.join(', ') : 'ninguno'}) · Negras (${bAtt.length ? bAtt.join(', ') : 'ninguno'}).`,
  );
  if (fromHere.length) {
    parts.push(`Jugadas legales desde ${square}: ${fromHere.map((m) => `${m.sanEs}${m.isBook ? ' (teórica)' : ''}`).join(', ')}.`);
  } else if (toHere.length) {
    parts.push(`Jugadas legales hacia ${square}: ${toHere.map((m) => `${m.sanEs}${m.isBook ? ' (teórica)' : ''}`).join(', ')}.`);
  }

  return {
    square,
    piece: occ
      ? { type: occ.type, color: occ.color, label: `${PIECE_NAME[occ.type]} de ${COLOR_NAME[occ.color]}` }
      : null,
    keySquareRole: keyRole,
    controlledSquares: controlled,
    whiteAttackers: wAtt,
    blackAttackers: bAtt,
    legalMovesFromHere: fromHere,
    legalMovesToHere: toHere,
    summary: parts.join(' '),
    arrows: arrows.slice(0, 5),
    highlights,
  };
}

/**
 * Responde cualquier pregunta del usuario sobre la apertura y la posición actual,
 * combinando la validación táctica de Stockfish con el análisis posicional y la biblioteca.
 */
export async function askOpeningCoach(
  question: string,
  ctx: OpeningCoachContext,
  opts: { depth?: number } = {},
): Promise<OpeningCoachAnswer> {
  const depth = opts.depth ?? 12;
  const cacheKey = `${ctx.opening.id}|${ctx.line.id}|${ctx.fen}|${ctx.userColor}|${ctx.level}|${ctx.selectedSquare ?? ''}|${normalizeText(question)}`;
  const cached = answerCache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const chess = new Chess(ctx.fen);
  const stm = chess.turn();
  const qNorm = normalizeText(question);

  // 1) Analizar la posición actual con Stockfish
  const analysis = await analyzePosition(ctx.fen, { depth, multipv: 3 });
  const topLine = analysis.lines[0];
  const bestUci = topLine?.pv[0] ?? analysis.bestMove ?? '';
  const bestSanEs = bestUci ? localizeSan(uciToSan(ctx.fen, bestUci), 'es') : '—';
  const pvSanEs = topLine?.pv?.length ? pvToSan(ctx.fen, topLine.pv, 6).map((s) => localizeSan(s, 'es')) : [];
  const pvFormatted = topLine?.pv?.length ? formatLine(ctx.fen, pvToSan(ctx.fen, topLine.pv, 6), 'es') : '—';
  const scoreObj = topLine?.score ?? { kind: 'cp', value: 0 };
  const scoreText = formatScore(scoreObj, ctx.userColor);
  const scoreDesc = describeScore(scoreObj, ctx.userColor);

  // Buscar nodo actual en el árbol de variantes de la apertura
  const tree = buildTree(ctx.opening);
  const followed = followUci(tree, ctx.uciHistory);
  const bookChildren = followed.depth === ctx.uciHistory.length ? orderedChildren(followed.node) : [];

  const arrows: Arrow[] = [];
  const highlights: Square[] = [];
  const threatened: Square[] = [];
  const bullets: string[] = [];

  if (bestUci.length >= 4) {
    arrows.push({
      orig: bestUci.slice(0, 2) as Square,
      dest: bestUci.slice(2, 4) as Square,
      brush: 'green',
    });
  }

  for (const ks of ctx.opening.keySquares.slice(0, 2)) {
    if (!highlights.includes(ks.square)) highlights.push(ks.square);
  }

  // Detectar si el usuario pregunta por una jugada alternativa concreta ("¿por qué no Dh5?", "¿qué pasa si cxd5?")
  const candidateMove =
    qNorm.includes('por que no') ||
    qNorm.includes('que pasa si') ||
    qNorm.includes('que sucede si') ||
    qNorm.includes('intercambi') ||
    qNorm.includes('si muevo') ||
    qNorm.includes('si juego')
      ? detectCandidateMoveInQuestion(ctx.fen, question)
      : null;

  let comparedMove: OpeningCoachAnswer['engineFact']['comparedMove'] | undefined;
  if (candidateMove) {
    const uciCand = moveToUci(candidateMove);
    const judged = await judgeMove(ctx.fen, uciCand, Math.min(10, depth));
    comparedMove = {
      playedSanEs: judged.sanEs,
      scoreText: judged.scoreText,
      lossCp: judged.lossCp,
      verdictLabel: VERDICT_LABEL[judged.verdict],
      lineEs: judged.line,
    };
    arrows.push({
      orig: candidateMove.from,
      dest: candidateMove.to,
      brush: judged.lossCp <= 50 ? 'blue' : 'red',
    });
  }

  let headline = `Entrenador IA · ${ctx.opening.short ?? ctx.opening.name} (${ctx.opening.eco})`;
  let strategic = '';

  // Caso A: Pregunta sobre una jugada alternativa o intercambio evaluado por Stockfish
  if (candidateMove && comparedMove) {
    headline = `Análisis de la jugada ${comparedMove.playedSanEs} (${comparedMove.verdictLabel})`;
    const lossPawns = (comparedMove.lossCp / 100).toFixed(2);
    if (comparedMove.lossCp <= 35) {
      strategic = `La jugada ${comparedMove.playedSanEs} es totalmente jugable en esta posición: pierde apenas ${lossPawns} peones respecto a la recomendación principal de Stockfish (${bestSanEs}). Tras ${comparedMove.playedSanEs}, la línea principal calculada por el motor continúa con ${comparedMove.lineEs}. `;
    } else {
      strategic = `Mover ${comparedMove.playedSanEs} aquí es un ${comparedMove.verdictLabel.toLowerCase()} (cede unos ${lossPawns} peones de evaluación frente a ${bestSanEs}). Estratégicamente se desvía de las prioridades de la ${ctx.opening.short ?? ctx.opening.name} y permite al rival tomar la iniciativa con la secuencia ${comparedMove.lineEs}. `;
    }
    if (ctx.currentMove) {
      strategic += `En la lección actual se prefiere ${ctx.currentMove.sanEs} porque: ${ctx.currentMove.teaching.why}`;
    }
    bullets.push(`Jugada consultada: ${comparedMove.playedSanEs} → ${comparedMove.verdictLabel} (${comparedMove.scoreText}).`);
    bullets.push(`Mejor jugada según Stockfish: ${bestSanEs} (${pvFormatted}).`);
  }
  // Caso B: "¿Por qué este movimiento es el mejor?" o explicación de la jugada actual
  else if (
    qNorm.includes('por que este movimiento') ||
    qNorm.includes('por que es el mejor') ||
    qNorm.includes('por que se juega') ||
    qNorm.includes('explica esta jugada')
  ) {
    if (ctx.currentMove) {
      const mv = ctx.currentMove;
      headline = `Razonamiento detrás de ${mv.ply % 2 === 1 ? `${Math.ceil(mv.ply / 2)}.` : `${Math.ceil(mv.ply / 2)}...`}${mv.sanEs}`;
      strategic = `${mv.teaching.why} ${mv.teaching.consequence} Además, ${mv.teaching.controls.toLowerCase()} ${mv.teaching.rival}`;
      bullets.push(`Objetivo: ${mv.teaching.why}`);
      bullets.push(`Control de casillas: ${mv.teaching.controls}`);
      bullets.push(`Si se jugara otra cosa: ${mv.teaching.alternative}`);
      for (const a of mv.teaching.arrows) arrows.push(a);
      for (const h of mv.teaching.highlights) if (!highlights.includes(h)) highlights.push(h);
    } else {
      const nextBook = bookChildren[0];
      headline = `Por qué ${nextBook ? nextBook.sanEs : bestSanEs} es la mejor continuación`;
      strategic = nextBook
        ? `En esta posición de la ${ctx.opening.name}, la jugada teórica principal es ${nextBook.sanEs} y coincide con el espíritu estratégico de la apertura: ${ctx.opening.goals[0]} Stockfish respalda la posición con evaluación ${scoreText} (${pvFormatted}).`
        : `Stockfish recomienda ${bestSanEs} (${pvFormatted}) porque mejora la actividad central y coordina las piezas conforme a los objetivos de la ${ctx.opening.name}.`;
      bullets.push(`Continuación principal: ${bestSanEs} (${pvFormatted}).`);
      bullets.push(`Objetivo de la apertura: ${ctx.opening.goals[0]}`);
    }
  }
  // Caso C: "¿Qué amenazas existen?" o "¿Cómo puedo aprovechar esta debilidad?"
  else if (qNorm.includes('amenaza') || qNorm.includes('debilidad') || qNorm.includes('tactic') || qNorm.includes('colgad')) {
    headline = `Amenazas tácticas y debilidades en la posición`;
    const rival = other(stm);
    const myThreats = threatsOf(chess, stm);
    const rivalThreats = threatsOf(chess, rival);
    const hangStm = hangingPieces(chess, stm);
    const hangRival = hangingPieces(chess, rival);
    const pins = [...findPins(chess, 'w'), ...findPins(chess, 'b')];

    const parts: string[] = [];
    if (chess.inCheck()) {
      parts.push(`¡El rey de las ${COLOR_NAME[stm]} está en jaque y debe responder de inmediato!`);
    }
    if (myThreats.length) {
      parts.push(
        `El bando al turno (${COLOR_NAME[stm]}) dispone de amenazas directas: ${myThreats
          .slice(0, 2)
          .map((t) => `${localizeSan(t.san, 'es')}${t.target ? ` sobre ${pieceAt(t.target.type, t.target.square)}` : ''}`)
          .join(', ')}.`,
      );
      for (const t of myThreats.slice(0, 2)) {
        if (t.target) threatened.push(t.target.square);
      }
    }
    if (rivalThreats.length) {
      parts.push(
        `El rival (${COLOR_NAME[rival]}) amenaza si le tocara mover: ${rivalThreats
          .slice(0, 2)
          .map((t) => `${localizeSan(t.san, 'es')}${t.target ? ` contra ${pieceAt(t.target.type, t.target.square)}` : ''}`)
          .join(', ')}.`,
      );
      for (const t of rivalThreats.slice(0, 2)) {
        if (t.target && !threatened.includes(t.target.square)) threatened.push(t.target.square);
      }
    }
    if (hangStm.length || hangRival.length) {
      const allHang = [...hangStm, ...hangRival];
      parts.push(
        `Piezas vulnerables o insuficientemente defendidas: ${allHang
          .map((h) => `${pieceAt(h.type, h.square)} (${COLOR_NAME[h.color]})`)
          .join(', ')}.`,
      );
    }
    if (pins.length) {
      parts.push(
        `Clavadas activas en el tablero: ${pins
          .map((p) => `${pieceAt(p.pinned.type, p.pinned.square)} clavado por ${pieceAt(p.pinner.type, p.pinner.square)}`)
          .join('; ')}.`,
      );
    }
    if (!parts.length) {
      parts.push(
        `No hay piezas colgadas ni capturas tácticas inmediatas; la lucha se centra en las casillas estratégicas (${ctx.opening.keySquares
          .map((k) => `${k.square}: ${k.role}`)
          .slice(0, 2)
          .join('; ')}).`,
      );
    }
    strategic = parts.join(' ');
    for (const ks of ctx.opening.keySquares) {
      bullets.push(`Casilla clave ${ks.square}: ${ks.role}`);
    }
  }
  // Caso D: "¿Qué piezas debería desarrollar primero?" / "¿Qué pieza está peor ubicada?"
  else if (qNorm.includes('peor ubicada') || qNorm.includes('desarrollar') || qNorm.includes('mejorar mi posicion')) {
    headline = `Desarrollo ideal y mejora de piezas (${COLOR_NAME[ctx.userColor]})`;
    const worst = findWorstPlacedPiece(chess, ctx.userColor, ctx.opening);
    const devInfo = ctx.opening.development.map((d) => `${d.piece}: ${d.idea}`);
    if (worst) {
      highlights.unshift(worst.square);
      if (worst.suggestedMove) {
        arrows.unshift({ orig: worst.suggestedMove.from, dest: worst.suggestedMove.to, brush: 'blue' });
      }
      strategic = `Tu pieza que más necesita activarse ahora mismo es ${worst.pieceDesc}. ${worst.reason} ${
        worst.suggestedMove ? `Una jugada natural para activarla es ${localizeSan(worst.suggestedMove.san, 'es')}.` : ''
      } Además, Stockfish sugiere como mejor jugada global en la posición ${bestSanEs} (${pvFormatted}).`;
    } else {
      strategic = `Tus piezas menores ya tienen buena actividad. En la ${ctx.opening.name}, recuerda el esquema ideal de colocación de piezas y coordínalas con la recomendación del motor (${bestSanEs}).`;
    }
    for (const d of devInfo) bullets.push(d);
  }
  // Caso E: "¿Cuál es el plan de las negras / blancas?"
  else if (qNorm.includes('plan') || qNorm.includes('objetivo') || qNorm.includes('estrategi')) {
    const askBlack = qNorm.includes('negra') || (!qNorm.includes('blanca') && ctx.userColor === 'b');
    const sideToExplain: Color = askBlack ? 'b' : 'w';
    headline = `Plan estratégico de las ${COLOR_NAME[sideToExplain]} en ${ctx.opening.short ?? ctx.opening.name}`;
    const sidePlans = ctx.opening.plans[sideToExplain];
    const oppPlans = ctx.opening.plans[other(sideToExplain)];
    strategic = `En la ${ctx.opening.name}, el plan maestro de las ${COLOR_NAME[sideToExplain]} consiste en: ${sidePlans.join(' ')} Mientras tanto, debes vigilar el plan del rival (${COLOR_NAME[other(sideToExplain)]}): ${oppPlans[0] ?? ''} En la posición actual del tablero, Stockfish concreta este plan mediante la línea ${pvFormatted}.`;
    for (const p of sidePlans) bullets.push(`Plan ${COLOR_NAME[sideToExplain]}: ${p}`);
    for (const s of ctx.opening.structures) bullets.push(`Estructura típica: ${s}`);
  }
  // Caso F: "¿Qué pasa si mi rival juega otra cosa?" / Variantes disponibles
  else if (qNorm.includes('otra cosa') || qNorm.includes('variante') || qNorm.includes('alternativa')) {
    headline = `Variantes y alternativas en ${ctx.opening.short ?? ctx.opening.name}`;
    if (bookChildren.length > 1) {
      const list = bookChildren
        .map((c) => {
          const lName = ctx.opening.compiled.find((l) => c.lineIds.includes(l.id))?.name ?? 'Variante teórica';
          return `${c.sanEs} (${lName})`;
        })
        .join('; ');
      strategic = `Desde esta posición exacta nuestro árbol teórico recoge varias bifurcaciones: ${list}. Si tu rival se aparta de la línea principal, las tres mejores jugadas objetivas según Stockfish 19 son: ${analysis.lines
        .map((l) => `${localizeSan(uciToSan(ctx.fen, l.pv[0]), 'es')} (${formatScore(l.score, stm)})`)
        .join(', ')}.`;
      for (const c of bookChildren) {
        if (c.uci.length >= 4) {
          arrows.push({
            orig: c.uci.slice(0, 2) as Square,
            dest: c.uci.slice(2, 4) as Square,
            brush: c.isMain ? 'green' : 'blue',
          });
        }
      }
    } else {
      const varSummary = ctx.opening.compiled.map((l) => `${l.name} (${l.eco}): ${l.idea || l.pgn}`).join(' | ');
      strategic = `Las variantes fundamentales de la ${ctx.opening.name} son: ${varSummary}. En la posición actual del tablero, las tres continuaciones principales valoradas por Stockfish son: ${analysis.lines
        .map((l) => `${localizeSan(uciToSan(ctx.fen, l.pv[0]), 'es')} (${formatScore(l.score, stm)})`)
        .join(', ')}.`;
    }
    for (const l of ctx.opening.compiled) {
      bullets.push(`${l.name} (${l.eco}): ${l.idea}`);
    }
  }
  // Caso G: "¿Qué errores debo evitar?" / Trampas
  else if (qNorm.includes('error') || qNorm.includes('evitar') || qNorm.includes('trampa') || qNorm.includes('celada')) {
    headline = `Errores frecuentes y trampas en ${ctx.opening.short ?? ctx.opening.name}`;
    const trapText = ctx.opening.traps
      .map((t) => `Trampa «${t.name}»: ${t.explanation}`)
      .join(' ');
    strategic = `En la ${ctx.opening.name} debes evitar especialmente estos errores típicos: ${ctx.opening.commonMistakes.join(' ')} ${trapText}`;
    for (const m of ctx.opening.commonMistakes) bullets.push(`Evita: ${m}`);
    for (const t of ctx.opening.traps) bullets.push(`Celada (${t.name}): ${t.explanation}`);
  }
  // Caso H: "¿Esta posición es buena para mí?" / Evaluación general de la posición
  else {
    headline = `Evaluación de la posición · ${ctx.opening.short ?? ctx.opening.name}`;
    const cW = centerControl(chess, 'w');
    const cB = centerControl(chess, 'b');
    const devW = development(chess, 'w');
    const devB = development(chess, 'b');
    const ksW = kingSafety(chess, 'w');
    const ksB = kingSafety(chess, 'b');
    const mobW = mobility(chess, 'w');
    const mobB = mobility(chess, 'b');
    const psW = pawnStructure(chess, 'w');
    const psB = pawnStructure(chess, 'b');

    strategic = `Con las ${COLOR_NAME[ctx.userColor]} tienes actualmente una ${scoreDesc} (evaluación de Stockfish: ${scoreText} a profundidad ${analysis.depth}). ` +
      `En el balance posicional: control central Blancas ${cW} vs Negras ${cB}; piezas menores por desarrollar Blancas ${devW.undevelopedMinors} vs Negras ${devB.undevelopedMinors}; ` +
      `movilidad ${mobW} vs ${mobB} jugadas legales. ` +
      `La jugada recomendada por el motor para quien tiene el turno (${COLOR_NAME[stm]}) es ${bestSanEs}, iniciando la secuencia ${pvFormatted}. ` +
      `Recuerda tu plan principal en la ${ctx.opening.short ?? ctx.opening.name}: ${ctx.opening.plans[ctx.userColor][0]}`;

    bullets.push(`Evaluación Stockfish 19: ${scoreText} (${scoreDesc}).`);
    bullets.push(`Mejor continuación: ${bestSanEs} → ${pvFormatted}.`);
    bullets.push(
      `Seguridad del rey: Blancas ${ksW.castled ? 'enrocadas' : 'en el centro'} · Negras ${ksB.castled ? 'enrocadas' : 'en el centro'}.`,
    );
    if (psW.isolated.length || psB.isolated.length || psW.doubled.length || psB.doubled.length) {
      bullets.push(
        `Estructura: peones aislados (B: ${psW.isolated.join(',') || 'ninguno'}, N: ${psB.isolated.join(',') || 'ninguno'}).`,
      );
    }
  }

  // Si hay casilla seleccionada en el tablero, añadir su inspección específica
  if (ctx.selectedSquare) {
    const sqInfo = inspectSquareOrPiece(ctx.fen, ctx.selectedSquare, ctx.opening);
    bullets.unshift(`Casilla seleccionada (${ctx.selectedSquare}): ${sqInfo.summary}`);
    for (const a of sqInfo.arrows.slice(0, 2)) arrows.push(a);
    if (!highlights.includes(ctx.selectedSquare)) highlights.unshift(ctx.selectedSquare);
  }

  const spokenText = `Evaluación del motor Stockfish: ${scoreText}, ${scoreDesc}. Mejor jugada: ${bestSanEs}. ${strategic}`;

  const answer: OpeningCoachAnswer = {
    id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    question,
    headline,
    engineFact: {
      scoreText,
      scoreDescription: scoreDesc,
      bestMoveSanEs: bestSanEs,
      bestMoveUci: bestUci,
      principalVariationEs: pvFormatted,
      depth: analysis.depth,
      comparedMove,
    },
    strategicExplanation: strategic,
    bulletPoints: bullets.slice(0, 5),
    spokenText,
    illustration: {
      arrows: arrows.slice(0, 5),
      highlights: highlights.slice(0, 5),
      threatened: threatened.slice(0, 4),
      variantSanEs: pvSanEs,
    },
    fromCache: false,
  };

  answerCache.set(cacheKey, answer);
  if (answerCache.size > MAX_ANSWER_CACHE) {
    const first = answerCache.keys().next().value;
    if (first !== undefined) answerCache.delete(first);
  }

  return answer;
}

export function clearOpeningCoachCache(): void {
  answerCache.clear();
}

export { PIECE_VALUE };
