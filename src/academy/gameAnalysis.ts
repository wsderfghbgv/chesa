/**
 * Analizador específico de la Fase de Apertura en partidas jugadas o importadas (Requisito 11).
 *
 * Conecta la Academia de Aperturas con el historial de partidas guardadas (`SavedGameRecord` en `db.ts`)
 * y con el motor de análisis existente (`engine.ts` / `StockfishEngine`) sin duplicar motores.
 */
import { Chess, type Move } from 'chess.js';
import { centerControl, development, kingSafety } from '../chess/features';
import { detectOpening, getBookContinuations } from '../chess/openings';
import { COLOR_NAME, START_FEN, fenKey, localizeSan, moveToUci, type Color } from '../chess/utils';
import type { SavedGameRecord } from '../storage/db';
import { VERDICT_LABEL, judgeMove, type MoveJudgement } from './engine';
import { OPENING_DEFS } from './library';
import { compileOpening } from './lessons';
import type { CompiledOpening } from './types';

export interface PrincipleViolation {
  id: string;
  title: string;
  ply: number;
  moveSanEs: string;
  explanation: string;
}

export interface OpeningPhaseAnalysisReport {
  sourceTitle: string;
  playerColor: Color;
  totalOpeningPliesAnalyzed: number;
  /** Apertura identificada en la Academia (si coincide) y/o en el catálogo ECO general. */
  detectedOpening: {
    eco: string;
    name: string;
    academyOpeningId: string | null;
    academyLineName: string | null;
  };
  /** ¿Siguió la teoría conocida durante los primeros movimientos? */
  followedTheoryPlies: number;
  /** Momento exacto en que se salió de la teoría conocida. */
  outOfBook: {
    ply: number;
    moveNumber: number;
    mover: Color;
    playedSanEs: string;
    playedUci: string;
    fenBefore: string;
    fenAfter: string;
    bookAlternatives: Array<{ sanEs: string; uci: string; variantName: string }>;
  } | null;
  /** Primer error importante detectado en la fase de apertura (primeras 10-12 jugadas). */
  firstMistake: {
    ply: number;
    moveNumber: number;
    mover: Color;
    playedSanEs: string;
    bestSanEs: string;
    lossCp: number;
    verdictLabel: string;
    lineEs: string;
    fenBefore: string;
    explanation: string;
  } | null;
  /** Principios estratégicos de apertura incumplidos por el usuario. */
  violatedPrinciples: PrincipleViolation[];
  /** Recomendaciones concretas de mejora para futuras partidas. */
  improvementAdvice: string[];
  /** ID de la apertura de la Academia recomendada para estudiar tras este análisis. */
  recommendedAcademyOpeningId: string;
  /** Resumen jugada a jugada de la apertura. */
  plySummaries: Array<{
    ply: number;
    moveNumber: number;
    mover: Color;
    sanEs: string;
    uci: string;
    fenAfter: string;
    inTheory: boolean;
    judgement?: MoveJudgement;
  }>;
}

interface BookEntry {
  openingId: string;
  openingName: string;
  eco: string;
  lineName: string;
  nextMoves: Array<{ uci: string; sanEs: string; variantName: string }>;
}

let academyBookMap: Map<string, BookEntry> | null = null;

function getAcademyBookMap(): Map<string, BookEntry> {
  if (academyBookMap) return academyBookMap;
  const map = new Map<string, BookEntry>();
  for (const def of OPENING_DEFS) {
    const comp = compileOpening(def);
    for (const line of comp.compiled) {
      for (let i = 0; i < line.fens.length; i++) {
        const fk = fenKey(line.fens[i]);
        const existing = map.get(fk) ?? {
          openingId: comp.id,
          openingName: comp.name,
          eco: line.eco || comp.eco,
          lineName: line.name,
          nextMoves: [],
        };
        const mv = line.moves[i];
        if (mv && !existing.nextMoves.some((x) => x.uci === mv.uci)) {
          existing.nextMoves.push({
            uci: mv.uci,
            sanEs: mv.sanEs,
            variantName: line.name,
          });
        }
        map.set(fk, existing);
      }
    }
  }
  academyBookMap = map;
  return map;
}

/**
 * Extrae las jugadas verbosas desde un texto PGN o secuencia de jugadas SAN/UCI.
 */
export function parseGameMovesForOpeningAnalysis(input: string): {
  verboseMoves: Move[];
  fens: string[];
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { verboseMoves: [], fens: [START_FEN], error: 'Introduce un PGN o secuencia de jugadas.' };
  }

  // Intentar primero con loadPgn de chess.js
  const cPgn = new Chess();
  try {
    cPgn.loadPgn(trimmed);
    const hist = cPgn.history({ verbose: true });
    if (hist.length > 0) {
      const replayChess = new Chess();
      const fens = [replayChess.fen()];
      for (const m of hist) {
        replayChess.move({ from: m.from, to: m.to, promotion: m.promotion });
        fens.push(replayChess.fen());
      }
      return { verboseMoves: hist, fens };
    }
  } catch {
    // Continuar con parseo token por token
  }

  // Parseo flexible de tokens SAN o UCI quitando comentarios y numeración
  const cleaned = trimmed
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const chess = new Chess();
  const fens = [chess.fen()];
  const verboseMoves: Move[] = [];

  for (const tok of tokens) {
    // Normalizar SAN en español (Cf3 -> Nf3, Ac4 -> Bc4, etc.) si el usuario escribió en español
    const normalizedSan = tok.replace(/^[CATDR]/, (ch) => ({ C: 'N', A: 'B', T: 'R', D: 'Q', R: 'K' }[ch] ?? ch));
    let mv: Move | null = null;
    try {
      mv = chess.move(tok);
    } catch {
      try {
        mv = chess.move(normalizedSan);
      } catch {
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(tok)) {
          try {
            mv = chess.move({
              from: tok.slice(0, 2),
              to: tok.slice(2, 4),
              promotion: tok[4],
            });
          } catch {
            mv = null;
          }
        }
      }
    }
    if (!mv) break;
    verboseMoves.push(mv);
    fens.push(chess.fen());
  }

  if (verboseMoves.length === 0) {
    return { verboseMoves: [], fens: [START_FEN], error: 'No se encontraron jugadas legales válidas en el texto.' };
  }

  return { verboseMoves, fens };
}

/**
 * Detecta qué principios estratégicos de apertura incumplió el jugador en las primeras 10 jugadas.
 */
function detectPrincipleViolations(
  verboseMoves: Move[],
  fens: string[],
  playerColor: Color,
  followedTheoryPlies: number,
): PrincipleViolation[] {
  const violations: PrincipleViolation[] = [];
  const maxPly = Math.min(verboseMoves.length, 20);
  const pieceMoveCounts = new Map<string, number>();

  for (let i = 0; i < maxPly; i++) {
    const mv = verboseMoves[i];
    const ply = i + 1;
    const sanEs = localizeSan(mv.san, 'es');
    if (mv.color !== playerColor) continue;

    // Si estaba dentro de la teoría conocida de la Academia no lo marcamos como violación de principio básico
    const isOutOfBook = ply > followedTheoryPlies;

    // 1) Salida prematura de la dama en las primeras 5 jugadas fuera de teoría
    if (isOutOfBook && mv.piece === 'q' && ply <= 10) {
      violations.push({
        id: `viol-queen-${ply}`,
        title: 'Salida prematura de la dama',
        ply,
        moveSanEs: sanEs,
        explanation: `En la jugada ${Math.ceil(ply / 2)} moviste la dama (${sanEs}) antes de completar el desarrollo de tus caballos y alfiles, exponiéndola a perder tiempos.`,
      });
    }

    // 2) Mover la misma pieza menor varias veces sin necesidad fuera de teoría
    const prevCount = pieceMoveCounts.get(mv.from) ?? 0;
    pieceMoveCounts.delete(mv.from);
    pieceMoveCounts.set(mv.to, prevCount + 1);
    if (isOutOfBook && (mv.piece === 'n' || mv.piece === 'b') && prevCount + 1 >= 2 && ply <= 12 && !mv.captured) {
      violations.push({
        id: `viol-repeat-${ply}`,
        title: 'Mover dos veces la misma pieza en la apertura',
        ply,
        moveSanEs: sanEs,
        explanation: `Con ${sanEs} (jugada ${Math.ceil(ply / 2)}) volviste a mover una pieza ya desarrollada mientras otras piezas menores seguían en su casilla inicial.`,
      });
    }

    // 3) Avance de peones de flanco (a/h/g/f) debilitando o perdiendo tiempos fuera de teoría
    if (isOutOfBook && mv.piece === 'p' && ['a', 'h', 'f'].includes(mv.from[0]) && ply <= 8 && !mv.captured) {
      violations.push({
        id: `viol-flank-pawn-${ply}`,
        title: 'Avance prematuro de peón lateral o debilitamiento del rey',
        ply,
        moveSanEs: sanEs,
        explanation: `El avance ${sanEs} en la jugada ${Math.ceil(ply / 2)} no ayuda a controlar el centro ni a desarrollar piezas menores.`,
      });
    }
  }

  // 4) Comprobar estado al final de la apertura (ply 16..20): ¿rey sin enrocar y piezas menores sin salir?
  const checkIdx = Math.min(fens.length - 1, 18);
  if (checkIdx >= 12) {
    const endChess = new Chess(fens[checkIdx]);
    const dev = development(endChess, playerColor);
    const ks = kingSafety(endChess, playerColor);
    const lastPlayerMove = verboseMoves
      .slice(0, checkIdx)
      .reverse()
      .find((m) => m.color === playerColor);

    if (!ks.castled && lastPlayerMove) {
      violations.push({
        id: 'viol-no-castle',
        title: 'Retraso en la seguridad del rey (falta de enroque)',
        ply: checkIdx,
        moveSanEs: localizeSan(lastPlayerMove.san, 'es'),
        explanation: `Al llegar a la jugada ${Math.ceil(checkIdx / 2)}, tu rey de las ${COLOR_NAME[playerColor]} seguía en el centro sin enrocar.`,
      });
    }
    if (dev.undevelopedMinors >= 2 && lastPlayerMove) {
      violations.push({
        id: 'viol-undeveloped',
        title: 'Desarrollo incompleto de piezas menores',
        ply: checkIdx,
        moveSanEs: localizeSan(lastPlayerMove.san, 'es'),
        explanation: `Terminaste la fase de apertura con ${dev.undevelopedMinors} piezas menores todavía en la primera fila.`,
      });
    }
    if (centerControl(endChess, playerColor) + 3 < centerControl(endChess, playerColor === 'w' ? 'b' : 'w') && lastPlayerMove) {
      violations.push({
        id: 'viol-center',
        title: 'Cesión del control central',
        ply: checkIdx,
        moveSanEs: localizeSan(lastPlayerMove.san, 'es'),
        explanation: `El rival domina claramente las cuatro casillas centrales (d4, e4, d5, e5) al finalizar la apertura.`,
      });
    }
  }

  return violations.slice(0, 4);
}

/**
 * Analiza la fase de apertura de una partida (hasta 16 plies / 8 jugadas completas),
 * reutilizando Stockfish (`judgeMove`) cuando se solicita validación táctica o las evaluaciones ya guardadas.
 */
export async function analyzeOpeningPhase(params: {
  pgnOrMoves: string;
  playerColor?: Color;
  sourceTitle?: string;
  savedRecord?: SavedGameRecord;
  useEngine?: boolean;
  engineDepth?: number;
}): Promise<OpeningPhaseAnalysisReport> {
  const playerColor: Color = params.playerColor ?? params.savedRecord?.playerColor ?? 'w';
  const sourceTitle =
    params.sourceTitle ??
    (params.savedRecord
      ? `Partida del ${new Date(params.savedRecord.createdAt).toLocaleDateString('es-ES')} (${params.savedRecord.openingName ?? 'Partida'})`
      : 'Partida importada');

  const parsed = parseGameMovesForOpeningAnalysis(params.pgnOrMoves);
  const { verboseMoves, fens } = parsed;
  const maxOpeningPlies = Math.min(verboseMoves.length, 16);

  const bookMap = getAcademyBookMap();
  const ecoGeneral = detectOpening(fens);

  let lastBookEntry: BookEntry | null = bookMap.get(fenKey(START_FEN)) ?? null;
  let followedTheoryPlies = 0;
  let outOfBook: OpeningPhaseAnalysisReport['outOfBook'] = null;

  for (let i = 0; i < maxOpeningPlies; i++) {
    const mv = verboseMoves[i];
    const uci = moveToUci(mv);
    const beforeFk = fenKey(fens[i]);
    const afterFk = fenKey(fens[i + 1]);
    const entryBefore = bookMap.get(beforeFk);
    const generalBefore = getBookContinuations(fens[i]);

    const inAcademyAfter = bookMap.has(afterFk);
    const inGeneralMove = generalBefore.some((g) => g.uci === uci);

    if (inAcademyAfter || inGeneralMove) {
      followedTheoryPlies = i + 1;
      if (bookMap.has(afterFk)) {
        lastBookEntry = bookMap.get(afterFk)!;
      }
    } else if (!outOfBook) {
      const alternatives =
        entryBefore?.nextMoves ??
        generalBefore.map((g) => ({
          uci: g.uci,
          sanEs: localizeSan(g.san, 'es'),
          variantName: g.openingName,
        }));
      outOfBook = {
        ply: i + 1,
        moveNumber: Math.ceil((i + 1) / 2),
        mover: mv.color,
        playedSanEs: localizeSan(mv.san, 'es'),
        playedUci: uci,
        fenBefore: fens[i],
        fenAfter: fens[i + 1],
        bookAlternatives: alternatives.slice(0, 4),
      };
    }
  }

  const academyOpeningId =
    lastBookEntry && followedTheoryPlies > 0
      ? lastBookEntry.openingId
      : OPENING_DEFS.find((o) => ecoGeneral && o.eco === ecoGeneral.eco)?.id ?? 'italiana';

  const academyComp: CompiledOpening | undefined = compileOpening(
    OPENING_DEFS.find((o) => o.id === academyOpeningId) ?? OPENING_DEFS[0],
  );

  const detectedOpening: OpeningPhaseAnalysisReport['detectedOpening'] = {
    eco: (followedTheoryPlies > 0 && lastBookEntry?.eco) || ecoGeneral?.eco || academyComp.eco,
    name: (followedTheoryPlies > 0 && lastBookEntry?.openingName) || ecoGeneral?.name || academyComp.name,
    academyOpeningId: followedTheoryPlies > 0 ? academyOpeningId : null,
    academyLineName: followedTheoryPlies > 0 ? lastBookEntry?.lineName ?? null : null,
  };

  // Construir resúmenes por ply y buscar el primer error importante
  const plySummaries: OpeningPhaseAnalysisReport['plySummaries'] = [];
  let firstMistake: OpeningPhaseAnalysisReport['firstMistake'] = null;
  const useEngine = params.useEngine ?? true;
  const depth = params.engineDepth ?? 10;

  for (let i = 0; i < maxOpeningPlies; i++) {
    const mv = verboseMoves[i];
    const ply = i + 1;
    const uci = moveToUci(mv);
    const sanEs = localizeSan(mv.san, 'es');
    const inTheory = ply <= followedTheoryPlies;

    let judgement: MoveJudgement | undefined;
    // Evaluar con el motor las jugadas fuera de teoría (o donde buscamos el primer error)
    if (useEngine && (!inTheory || !firstMistake) && i >= Math.max(0, followedTheoryPlies - 1)) {
      try {
        judgement = await judgeMove(fens[i], uci, depth);
        if (!firstMistake && judgement.lossCp >= 70) {
          firstMistake = {
            ply,
            moveNumber: Math.ceil(ply / 2),
            mover: mv.color,
            playedSanEs: sanEs,
            bestSanEs: judgement.bestSanEs,
            lossCp: judgement.lossCp,
            verdictLabel: VERDICT_LABEL[judgement.verdict],
            lineEs: judgement.line,
            fenBefore: fens[i],
            explanation: `En la jugada ${Math.ceil(ply / 2)}, ${sanEs} cedió ${(judgement.lossCp / 100).toFixed(2)} peones respecto a la mejor jugada ${judgement.bestSanEs} (${judgement.line}).`,
          };
        }
      } catch {
        // Si el motor no está activo en un test sin motor, continuamos con el análisis teórico
      }
    }

    plySummaries.push({
      ply,
      moveNumber: Math.ceil(ply / 2),
      mover: mv.color,
      sanEs,
      uci,
      fenAfter: fens[i + 1],
      inTheory,
      judgement,
    });
  }

  const violatedPrinciples = detectPrincipleViolations(verboseMoves, fens, playerColor, followedTheoryPlies);

  const improvementAdvice: string[] = [];
  if (outOfBook) {
    const alts = outOfBook.bookAlternatives.map((a) => `${a.sanEs} (${a.variantName})`).join(', ');
    improvementAdvice.push(
      `Saliste de la teoría conocida en la jugada ${outOfBook.moveNumber} (${outOfBook.mover === 'w' ? 'Blancas' : 'Negras'}: ${outOfBook.playedSanEs}). ${
        alts ? `Estudia las continuaciones teóricas en esa posición: ${alts}.` : ''
      }`,
    );
  } else if (followedTheoryPlies > 0) {
    improvementAdvice.push(
      `¡Excelente! Seguiste la teoría conocida durante las primeras ${followedTheoryPlies} medias jugadas (${detectedOpening.name}).`,
    );
  }

  if (firstMistake) {
    improvementAdvice.push(
      `Tu primer error importante ocurrió en la jugada ${firstMistake.moveNumber} (${firstMistake.playedSanEs}, ${firstMistake.verdictLabel}). La alternativa correcta era ${firstMistake.bestSanEs}.`,
    );
  }

  for (const v of violatedPrinciples.slice(0, 2)) {
    improvementAdvice.push(`${v.title}: ${v.explanation}`);
  }

  improvementAdvice.push(
    `Plan estratégico a recordar en ${academyComp.short ?? academyComp.name} con ${COLOR_NAME[playerColor]}: ${academyComp.plans[playerColor][0]}`,
  );

  return {
    sourceTitle,
    playerColor,
    totalOpeningPliesAnalyzed: maxOpeningPlies,
    detectedOpening,
    followedTheoryPlies,
    outOfBook,
    firstMistake,
    violatedPrinciples,
    improvementAdvice,
    recommendedAcademyOpeningId: academyComp.id,
    plySummaries,
  };
}
