/**
 * Generador pedagógico del entrenador y de anotaciones visuales sobre el tablero.
 *
 * REGLA FUNDAMENTAL:
 * Ninguna variante ni recomendación se inventa. Toda jugada alternativa, evaluación y
 * refutación procede directamente del análisis real de Stockfish (`AnalysisResult` antes y
 * después del movimiento), combinado con la geometría real del tablero (`features.ts`).
 */
import { Chess, type Square } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import {
  type Color,
  other,
  parseUci,
  tryMove,
  uciToSan,
  pvToSan,
  formatLine,
  localizeSan,
  pieceAt,
  pieceWithArticle,
  PIECE_VALUE,
} from '../chess/utils';
import {
  type Phase,
  gamePhase,
  hangingPieces,
  findPins,
  forkFrom,
  kingSafety,
  development,
  centerControl,
  pawnStructure,
  discoveredAttacks,
  threatsOf,
  attackersOf,
} from '../chess/features';
import { detectOpening } from '../chess/openings';
import {
  type Score,
  cpFor,
  formatScore,
  describeScore,
  isMateFor,
} from '../engine/score';
import type { AnalysisResult } from '../engine/StockfishEngine';
import {
  classifyMove,
  type ClassificationResult,
  type ClassificationThresholds,
  type MoveCategory,
} from './classify';

export type ExplanationLevel = 'basico' | 'intermedio' | 'avanzado';

export type MotifId =
  | 'pieza_indefensa'
  | 'amenaza_ignorada'
  | 'ataque_doble'
  | 'clavada'
  | 'descubierta'
  | 'sobrecarga_desviacion'
  | 'sacrificio'
  | 'control_centro'
  | 'desarrollo'
  | 'seguridad_rey'
  | 'estructura_peones'
  | 'casillas_debiles'
  | 'actividad_piezas'
  | 'plan_estrategico'
  | 'finales'
  | 'gestion_tiempo';

export const MOTIF_LABELS: Record<MotifId, string> = {
  pieza_indefensa: 'Piezas indefensas',
  amenaza_ignorada: 'Amenazas del rival',
  ataque_doble: 'Ataque doble',
  clavada: 'Clavada',
  descubierta: 'Ataque a la descubierta',
  sobrecarga_desviacion: 'Sobrecarga y desviación',
  sacrificio: 'Sacrificio táctico',
  control_centro: 'Control del centro',
  desarrollo: 'Desarrollo de piezas',
  seguridad_rey: 'Seguridad del rey',
  estructura_peones: 'Estructura de peones',
  casillas_debiles: 'Casillas débiles',
  actividad_piezas: 'Actividad de las piezas',
  plan_estrategico: 'Plan estratégico',
  finales: 'Técnica de finales',
  gestion_tiempo: 'Gestión del tiempo',
};

export interface IllustrativeLine {
  label: string;
  startFen: string;
  uciMoves: string[];
  sanMoves: string[];
  formatted: string;
  kind: 'played_continuation' | 'best_alternative';
}

export interface MoveEvaluation {
  ply: number;
  moveNumber: number;
  mover: Color;
  fenBefore: string;
  fenAfter: string;
  /** 1. La jugada realizada. */
  playedUci: string;
  playedSan: string;
  playedSanEs: string;
  /** 2. Su clasificación. */
  classification: ClassificationResult;
  category: MoveCategory;
  /** 3. Evaluación antes y después (siempre normalizada a blancas). */
  scoreBefore: Score;
  scoreAfter: Score;
  depthBefore: number;
  depthAfter: number;
  /** 4. Mejor alternativa encontrada por Stockfish. */
  bestUci: string;
  bestSan: string;
  bestSanEs: string;
  bestScore: Score;
  /** 5. Diferencia entre la jugada realizada y la mejor alternativa. */
  cpLoss: number;
  effectiveLossCp: number;
  deltaText: string;
  /** 6. Explicación comprensible de lo que sucedió. */
  whatHappened: string;
  /** 7. Consecuencias tácticas o estratégicas (aciertos y riesgos). */
  consequences: string;
  whatYouDidWell: string;
  whatToWatch: string;
  bestAlternativeExplain: string;
  /** 8. Qué debería haber considerado antes de mover. */
  whatToConsider: string;
  /** 9. Recomendación concreta para evitar el mismo error y lección del profesor. */
  recommendation: string;
  coachLesson: string;
  /** Variantes ilustrativas (respuesta del rival y mejor línea del motor). */
  continuationLine: IllustrativeLine | null;
  bestLine: IllustrativeLine | null;
  /** Si había varias jugadas igualmente buenas, texto explicativo y lista SAN. */
  equallyGoodMovesSan: string[];
  equallyGoodNote: string | null;
  /** Motivos principales (máximo 3, priorizados por relevancia real en la posición). */
  motifs: MotifId[];
  phase: Phase;
  /** Formas visuales para dibujar en el tablero (flechas y casillas). */
  shapes: DrawShape[];
  /** Casillas vulnerables o atacadas para resaltar en el tablero. */
  vulnerableSquares: Square[];
  /** Tiempo empleado en la jugada (ms), si había reloj. */
  thinkTimeMs?: number;
  /** Explicación enriquecida opcional generada por LLM sobre estos mismos datos. */
  llmExplanation?: string;
}

export interface BuildEvaluationInput {
  ply: number;
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  analysisBefore: AnalysisResult;
  analysisAfter: AnalysisResult;
  level: ExplanationLevel;
  thresholds?: ClassificationThresholds;
  thinkTimeMs?: number;
  remainingClockMs?: number;
  fensHistory?: string[];
}

export function buildMoveEvaluation(input: BuildEvaluationInput): MoveEvaluation {
  const {
    ply,
    fenBefore,
    fenAfter,
    playedUci,
    analysisBefore,
    analysisAfter,
    level,
    thresholds,
    thinkTimeMs,
    remainingClockMs,
    fensHistory,
  } = input;

  const beforeChess = new Chess(fenBefore);
  const afterChess = new Chess(fenAfter);
  const mover: Color = beforeChess.turn();
  const opp: Color = other(mover);
  const moveNumber = parseInt(fenBefore.split(' ')[5] ?? '1', 10) || 1;
  const phase = gamePhase(beforeChess);

  const moveObj = tryMove(new Chess(fenBefore), playedUci);
  const playedSan = moveObj?.san ?? uciToSan(fenBefore, playedUci);
  const playedSanEs = localizeSan(playedSan, 'es');

  const topLineBefore = analysisBefore.lines[0];
  const scoreBefore: Score = topLineBefore?.score ?? { kind: 'cp', value: 0 };
  const topLineAfter = analysisAfter.lines[0];
  const scoreAfter: Score = topLineAfter?.score ?? scoreBefore;

  const bestUci = topLineBefore?.pv[0] ?? playedUci;
  const bestSan = uciToSan(fenBefore, bestUci);
  const bestSanEs = localizeSan(bestSan, 'es');

  const classification = classifyMove({
    mover,
    playedUci,
    scoreBefore,
    scoreAfter,
    linesBefore: analysisBefore.lines,
    thresholds,
  });

  // Alternativas igualmente buenas.
  const equallyGoodMovesSan = classification.equallyGoodUcis
    .map((u) => localizeSan(uciToSan(fenBefore, u), 'es'))
    .filter((v, i, a) => a.indexOf(v) === i);

  const equallyGoodNote =
    equallyGoodMovesSan.length > 1
      ? `En esta posición había varias jugadas prácticamente igual de buenas (${equallyGoodMovesSan.slice(0, 3).join(', ')}).`
      : null;

  // Variantes ilustrativas reales del motor.
  const contPv = (topLineAfter?.pv ?? []).slice(0, 6);
  const contSans = pvToSan(fenAfter, contPv, 6);
  const continuationLine: IllustrativeLine | null =
    contSans.length > 0
      ? {
          label: classification.meta.isMistake ? 'Cómo lo aprovecha el rival' : 'Continuación esperada',
          startFen: fenAfter,
          uciMoves: contPv.slice(0, contSans.length),
          sanMoves: contSans,
          formatted: formatLine(fenAfter, contSans, 'es'),
          kind: 'played_continuation',
        }
      : null;

  const bestPv = (topLineBefore?.pv ?? []).slice(0, 6);
  const bestSans = pvToSan(fenBefore, bestPv, 6);
  const bestLine: IllustrativeLine | null =
    bestSans.length > 0
      ? {
          label: 'Mejor línea del motor',
          startFen: fenBefore,
          uciMoves: bestPv.slice(0, bestSans.length),
          sanMoves: bestSans,
          formatted: formatLine(fenBefore, bestSans, 'es'),
          kind: 'best_alternative',
        }
      : null;

  // Diferencia numérica clara.
  const beforeStr = formatScore(scoreBefore, mover);
  const afterStr = formatScore(scoreAfter, mover);
  const pawnsLost = (classification.cpLoss / 100).toFixed(2);
  const deltaText =
    classification.cpLoss <= 8
      ? `Sin pérdida apreciable (${beforeStr} → ${afterStr}).`
      : `De ${beforeStr} a ${afterStr} (pérdida de ${pawnsLost} peones; impacto efectivo: ${(classification.effectiveLossCp / 100).toFixed(2)}).`;

  // Detección de hechos concretos en el tablero antes y después.
  const parsedPlayed = parseUci(playedUci);
  const parsedBest = parseUci(bestUci);
  const oppReplyUci = contPv[0] ?? null;
  const oppReplyParsed = oppReplyUci ? parseUci(oppReplyUci) : null;
  const oppReplySanEs = oppReplyUci ? localizeSan(uciToSan(fenAfter, oppReplyUci), 'es') : null;

  const hangingBeforeOwn = hangingPieces(beforeChess, mover);
  const hangingAfterOwn = hangingPieces(afterChess, mover);
  const newHangingOwn = hangingAfterOwn.filter(
    (h) => !hangingBeforeOwn.some((b) => b.square === h.square && b.gain >= h.gain),
  );

  const hangingBeforeOpp = hangingPieces(beforeChess, opp);
  const threatsBeforeByOpp = threatsOf(beforeChess, opp);
  const pinsAfterByOpp = findPins(afterChess, opp);
  const pinsAfterByMover = findPins(afterChess, mover);
  const forkByMover = forkFrom(afterChess, parsedPlayed.to);
  const discoveredByMover = discoveredAttacks(beforeChess, afterChess, parsedPlayed.from, mover);

  // ¿La respuesta del motor rival hace una horquilla, captura material o da mate?
  let oppForkAfterReply: ReturnType<typeof forkFrom> = null;
  let oppCapturesSquare: Square | null = null;
  let oppCapturedPieceName: string | null = null;
  if (oppReplyParsed) {
    const targetBeforeReply = afterChess.get(oppReplyParsed.to);
    if (targetBeforeReply && targetBeforeReply.color === mover) {
      oppCapturesSquare = oppReplyParsed.to;
      oppCapturedPieceName = pieceAt(targetBeforeReply.type, oppReplyParsed.to);
    }
    const simReply = new Chess(fenAfter);
    if (tryMove(simReply, oppReplyUci!)) {
      oppForkAfterReply = forkFrom(simReply, oppReplyParsed.to);
    }
  }

  // ¿Qué hacía la mejor jugada del motor si era distinta a la jugada realizada?
  const bestChessAfter = new Chess(fenBefore);
  const bestMoveObj = tryMove(bestChessAfter, bestUci);
  const bestFork = bestMoveObj ? forkFrom(bestChessAfter, parsedBest.to) : null;
  const bestDiscovered = bestMoveObj ? discoveredAttacks(beforeChess, bestChessAfter, parsedBest.from, mover) : [];
  const bestCaptured = bestMoveObj?.captured
    ? pieceAt(bestMoveObj.captured, parsedBest.to)
    : null;

  const ksBefore = kingSafety(beforeChess, mover);
  const ksAfter = kingSafety(afterChess, mover);
  const devBefore = development(beforeChess, mover);
  const devAfter = development(afterChess, mover);
  const centerBefore = centerControl(beforeChess, mover);
  const centerAfter = centerControl(afterChess, mover);
  const pawnsBefore = pawnStructure(beforeChess, mover);
  const pawnsAfter = pawnStructure(afterChess, mover);

  // Sacrificio táctico: entrega material en la casilla de llegada pero es la mejor jugada.
  const movedPiece = beforeChess.get(parsedPlayed.from);
  const isSacrifice =
    classification.meta.isPositive &&
    movedPiece &&
    PIECE_VALUE[movedPiece.type] >= 3 &&
    attackersOf(afterChess, parsedPlayed.to, opp).length > 0 &&
    attackersOf(afterChess, parsedPlayed.to, mover).length === 0 &&
    cpFor(scoreAfter, mover) >= 120;

  // Priorizar hasta 3 motivos realmente presentes.
  const motifs: MotifId[] = [];
  const pushMotif = (m: MotifId) => {
    if (!motifs.includes(m) && motifs.length < 3) motifs.push(m);
  };

  if (classification.meta.isMistake) {
    if (newHangingOwn.length > 0 || oppCapturesSquare) pushMotif('pieza_indefensa');
    if (threatsBeforeByOpp.length > 0 && oppCapturesSquare && threatsBeforeByOpp.some((t) => t.target?.square === oppCapturesSquare)) {
      pushMotif('amenaza_ignorada');
    }
    if (oppForkAfterReply || bestFork) pushMotif('ataque_doble');
    if (pinsAfterByOpp.length > 0) pushMotif('clavada');
    if (bestDiscovered.length > 0) pushMotif('descubierta');
    if (ksAfter.zoneAttacks > ksBefore.zoneAttacks + 1 || isMateFor(scoreAfter, opp)) pushMotif('seguridad_rey');
    if (pawnsAfter.doubled.length > pawnsBefore.doubled.length || pawnsAfter.isolated.length > pawnsBefore.isolated.length) {
      pushMotif('estructura_peones');
    }
    if (phase === 'apertura' && devAfter.undevelopedMinors === devBefore.undevelopedMinors && moveNumber <= 10) {
      pushMotif('desarrollo');
    }
    if (phase === 'final') pushMotif('finales');
  } else {
    if (isSacrifice) pushMotif('sacrificio');
    if (forkByMover) pushMotif('ataque_doble');
    if (discoveredByMover.length > 0) pushMotif('descubierta');
    if (pinsAfterByMover.length > 0) pushMotif('clavada');
    if (moveObj?.isKingsideCastle() || moveObj?.isQueensideCastle()) pushMotif('seguridad_rey');
    if (devAfter.undevelopedMinors < devBefore.undevelopedMinors) pushMotif('desarrollo');
    if (centerAfter > centerBefore) pushMotif('control_centro');
    if (pawnsAfter.passed.length > pawnsBefore.passed.length) pushMotif('estructura_peones');
    if (phase === 'final') pushMotif('finales');
  }

  if (thinkTimeMs !== undefined && remainingClockMs !== undefined) {
    if ((thinkTimeMs < 1500 && classification.meta.isMistake) || (remainingClockMs < 30000 && thinkTimeMs > 12000)) {
      pushMotif('gestion_tiempo');
    }
  }
  if (motifs.length === 0) {
    pushMotif(phase === 'apertura' ? 'desarrollo' : phase === 'final' ? 'finales' : 'actividad_piezas');
  }

  // Construcción de explicaciones concretas y adaptadas al nivel.
  const opening = fensHistory ? detectOpening(fensHistory) : null;

  let whatHappened = '';
  let whatYouDidWell = '';
  let whatToWatch = '';
  let bestAlternativeExplain = '';
  let whatToConsider = '';
  let recommendation = '';
  let coachLesson = '';

  const evalSummary =
    level === 'basico'
      ? `La posición pasa de ${describeScore(scoreBefore, mover)} a ${describeScore(scoreAfter, mover)}.`
      : `La evaluación del motor (profundidad ${analysisAfter.depth}) pasa de ${beforeStr} a ${afterStr}.`;

  if (classification.meta.isPositive) {
    // JUGADA POSITIVA (Excelente, Mejor, Precisa, Buena)
    const reasons: string[] = [];
    if (moveObj?.isKingsideCastle() || moveObj?.isQueensideCastle()) {
      reasons.push('pusiste a tu rey en seguridad mediante el enroque y activaste la torre');
    }
    if (devAfter.undevelopedMinors < devBefore.undevelopedMinors) {
      reasons.push(`desarrollaste ${pieceWithArticle(movedPiece!.type)} hacia una casilla activa`);
    }
    if (centerAfter > centerBefore) {
      reasons.push('aumentaste tu control sobre las casillas centrales (d4, e4, d5, e5)');
    }
    if (moveObj?.captured) {
      reasons.push(`capturaste en ${parsedPlayed.to} mejorando el balance material o la tensión a tu favor`);
    }
    if (forkByMover) {
      const targetsText = forkByMover.targets.map((t) => pieceAt(t.type, t.square)).join(' y ');
      reasons.push(`creaste un ataque doble desde ${parsedPlayed.to} contra ${targetsText}`);
    }
    if (discoveredByMover.length > 0) {
      const d = discoveredByMover[0];
      reasons.push(`abriste la línea de ${pieceAt(d.slider.type, d.slider.square)} sobre ${pieceAt(d.target.type, d.target.square)}`);
    }
    if (pinsAfterByMover.length > 0) {
      const p = pinsAfterByMover[0];
      reasons.push(`clavaste ${pieceAt(p.pinned.type, p.pinned.square)} delante de ${pieceAt(p.behind.type, p.behind.square)}`);
    }
    if (isSacrifice) {
      reasons.push('entregaste material con respaldo táctico concreto según la variante principal del motor');
    }
    if (reasons.length === 0) {
      reasons.push('mantuviste la coordinación de tus piezas y la valoración objetiva de la posición');
    }

    whatHappened = `Jugaste ${playedSanEs} (${classification.meta.label.toLowerCase()}): ${reasons.join(' y ')}. ${evalSummary}`;
    whatYouDidWell = reasons.map((r) => r[0].toUpperCase() + r.slice(1)).join('. ') + '.';

    if (newHangingOwn.length > 0) {
      const h = newHangingOwn[0];
      whatToWatch = `Vigila ${pieceAt(h.type, h.square)}: ha quedado con poca defensa si se abren líneas.`;
    } else if (oppReplySanEs && continuationLine) {
      whatToWatch = `La respuesta más incisiva del rival según Stockfish es ${oppReplySanEs} (${continuationLine.formatted}).`;
    } else {
      whatToWatch = 'Antes de tu siguiente jugada, revisa qué cambia la respuesta del rival sobre tus piezas.';
    }

    if (playedUci === bestUci) {
      bestAlternativeExplain = `${playedSanEs} coincide exactamente con la primera opción de Stockfish${equallyGoodNote ? ` (${equallyGoodNote.toLowerCase()})` : ''}.`;
    } else {
      bestAlternativeExplain = `Stockfish prefería ligeramente ${bestSanEs} (${formatScore(scoreBefore, mover)}${bestLine ? `: ${bestLine.formatted}` : ''}), aunque tu elección mantiene la calidad de la posición.`;
    }

    whatToConsider =
      phase === 'apertura' && opening
        ? `Plan típico en ${opening.name}: ${mover === 'w' ? opening.planWhite : opening.planBlack}`
        : 'Sigue verificando jaques, capturas y amenazas del rival antes de ejecutar tu plan.';

    recommendation =
      level === 'avanzado'
        ? `Compara la línea ${bestLine?.formatted ?? bestSanEs} con la jugada de la partida para afinar el orden de jugadas.`
        : 'Mantén este hábito: desarrollar con propósito sin dejar piezas desprotegidas.';

    coachLesson =
      forkByMover || discoveredByMover.length > 0
        ? 'La táctica nace de una buena coordinación: las piezas activas crean amenazas dobles de forma natural.'
        : phase === 'apertura'
          ? 'En la apertura, cada jugada debe contribuir al control del centro, al desarrollo o a la seguridad del rey.'
          : phase === 'final'
            ? 'En los finales, la actividad del rey y el avance coordinado de los peones pasados deciden la partida.'
            : 'Una buena jugada mejora tu pieza peor colocada sin conceder contrajuego táctico al rival.';
  } else {
    // JUGADA CON DEFECTO (Oportunidad perdida, Imprecisión, Error, Error grave)
    const problems: string[] = [];

    if (isMateFor(scoreAfter, opp) && !isMateFor(scoreBefore, opp)) {
      const m = Math.abs(scoreAfter.value);
      problems.push(`permite mate forzado en ${m} jugada${m === 1 ? '' : 's'} empezando con ${oppReplySanEs ?? 'la respuesta del motor'}`);
    } else if (newHangingOwn.length > 0) {
      const h = newHangingOwn[0];
      const att = h.attackers[0];
      const why = h.reason === 'undefended' ? 'quedó sin ningún defensor' : `quedó atacada por una pieza de menor valor (${pieceAt(att.type, att.square)})`;
      problems.push(`${pieceAt(h.type, h.square)} ${why}`);
    } else if (oppCapturesSquare && oppCapturedPieceName) {
      problems.push(`permite al rival capturar ${oppCapturedPieceName} con ${oppReplySanEs}`);
    }

    if (oppForkAfterReply) {
      const targets = oppForkAfterReply.targets.map((t) => pieceAt(t.type, t.square)).join(' y ');
      problems.push(`tras ${oppReplySanEs}, el rival ataca simultáneamente ${targets}`);
    }

    if (pinsAfterByOpp.length > 0) {
      const p = pinsAfterByOpp[0];
      problems.push(`${pieceAt(p.pinned.type, p.pinned.square)} queda clavada por ${pieceAt(p.pinner.type, p.pinner.square)} delante de ${pieceAt(p.behind.type, p.behind.square)}`);
    }

    if (classification.category === 'oportunidad_perdida') {
      if (isMateFor(scoreBefore, mover)) {
        problems.unshift(`dejaste escapar un mate forzado que empezaba con ${bestSanEs}`);
      } else if (bestCaptured) {
        problems.unshift(`desaprovechaste la oportunidad de ganar ${bestCaptured} con ${bestSanEs}`);
      } else if (bestFork) {
        const targets = bestFork.targets.map((t) => pieceAt(t.type, t.square)).join(' y ');
        problems.unshift(`tenías el golpe táctico ${bestSanEs}, atacando a la vez ${targets}`);
      } else {
        problems.unshift(`dejaste pasar ${bestSanEs}, que te daba una ventaja mucho mayor (${beforeStr})`);
      }
    }

    if (problems.length === 0) {
      if (oppReplySanEs) {
        problems.push(`concede la iniciativa al rival con ${oppReplySanEs}, empeorando la coordinación de tus piezas`);
      } else {
        problems.push('deteriora tu posición en comparación con la mejor alternativa disponible');
      }
    }

    whatHappened = `Con ${playedSanEs} (${classification.meta.label.toLowerCase()}), ${problems.join('; ')}. ${evalSummary}`;

    whatYouDidWell =
      devAfter.undevelopedMinors < devBefore.undevelopedMinors
        ? 'Tu intención de desarrollar una pieza era razonable, pero había un detalle táctico urgente.'
        : centerAfter > centerBefore
          ? 'Buscaste disputar el centro, aunque el momento táctico exigía otra prioridad.'
          : 'Intentaste seguir un plan propio, pero el cálculo concreto de la respuesta rival cambiaba la valoración.';

    whatToWatch =
      continuationLine && oppReplySanEs
        ? `Amenaza y castigo concreto del rival: ${oppReplySanEs}, siguiendo con ${continuationLine.formatted}.`
        : 'Revisa qué piezas quedan sin defensa después de retirar el defensor de su casilla original.';

    const bestReasons: string[] = [];
    if (bestCaptured) bestReasons.push(`captura ${bestCaptured}`);
    if (bestFork) {
      bestReasons.push(`crea un ataque doble sobre ${bestFork.targets.map((t) => pieceAt(t.type, t.square)).join(' y ')}`);
    }
    if (bestDiscovered.length > 0) {
      const d = bestDiscovered[0];
      bestReasons.push(`descubre el ataque de ${pieceAt(d.slider.type, d.slider.square)} sobre ${pieceAt(d.target.type, d.target.square)}`);
    }
    if (hangingBeforeOpp.length > 0 && parsedBest.to === hangingBeforeOpp[0].square) {
      bestReasons.push(`aprovecha que ${pieceAt(hangingBeforeOpp[0].type, hangingBeforeOpp[0].square)} estaba indefensa`);
    }
    if (threatsBeforeByOpp.length > 0 && bestReasons.length === 0) {
      bestReasons.push(`neutraliza la amenaza rival (${localizeSan(threatsBeforeByOpp[0].san, 'es')})`);
    }
    if (bestReasons.length === 0) {
      bestReasons.push(`mantiene la valoración en ${beforeStr}`);
    }

    bestAlternativeExplain = `La mejor jugada era ${bestSanEs}, que ${bestReasons.join(' y ')}${bestLine ? ` (${bestLine.formatted})` : ''}.`;

    if (newHangingOwn.length > 0) {
      const h = newHangingOwn[0];
      whatToConsider = `Antes de mover ${pieceAt(movedPiece?.type ?? 'p', parsedPlayed.from)}, debías preguntarte: «¿Qué piezas mías dejaba de defender esta jugada y quién vigila ${h.square}?».`;
      recommendation = `Aplica la comprobación anti-colgadas: antes de soltar la pieza, verifica que ninguna pieza propia quede con más atacantes que defensores (en este caso, ${pieceAt(h.type, h.square)}).`;
      coachLesson = 'Una pieza sin defensa (o defendida solo por otra sobrecargada) es el imán de todas las combinaciones tácticas.';
    } else if (threatsBeforeByOpp.length > 0) {
      const t = threatsBeforeByOpp[0];
      whatToConsider = `Debías identificar primero la amenaza directa de tu rival (${localizeSan(t.san, 'es')}) antes de ejecutar tu propio plan.`;
      recommendation = 'Al terminar cada jugada del rival, pregúntate siempre: «¿Qué amenaza la última jugada de mi oponente?».';
      coachLesson = 'Ignorar la amenaza del rival es la causa número uno de errores tácticos: primero neutraliza o contraataca con una amenaza mayor.';
    } else if (classification.category === 'oportunidad_perdida') {
      whatToConsider = `En posiciones con piezas rivales sueltas o reyes expuestos, examina primero todos los jaques, capturas y amenazas forzadas (como ${bestSanEs}).`;
      recommendation = 'Dedica 10 segundos a buscar jugadas forzadas (jaques, capturas y ataques a piezas de mayor valor) antes de hacer una jugada tranquila.';
      coachLesson = 'Las oportunidades tácticas suelen durar un solo turno: busca siempre jugadas forzadas antes de jugar en automático.';
    } else {
      whatToConsider = `Debías comparar tu jugada con ${bestSanEs} calculando al menos la primera respuesta forzada del rival (${oppReplySanEs ?? 'su jugada más activa'}).`;
      recommendation = `Antes de decidirte, elige 2 jugadas candidatas (por ejemplo, ${playedSanEs} y ${bestSanEs}) y calcula una respuesta del rival para cada una.`;
      coachLesson = 'Pensar por jugadas candidatas evita mover por impulso y te permite detectar recursos ocultos del rival.';
    }
  }

  const consequences = `${whatYouDidWell} ${whatToWatch}`;

  // Formas visuales sobre el tablero (Chessground):
  // - Azul: jugada realizada.
  // - Verde: mejor alternativa de Stockfish (cuando difiere de la jugada realizada).
  // - Rojo: amenaza/respuesta punitiva del rival + círculo rojo en piezas vulnerables.
  const shapes: DrawShape[] = [];
  const vulnerableSquares: Square[] = [];

  shapes.push({ orig: parsedPlayed.from, dest: parsedPlayed.to, brush: 'blue' });
  if (bestUci !== playedUci) {
    shapes.push({ orig: parsedBest.from, dest: parsedBest.to, brush: 'green' });
  }
  if (classification.meta.isMistake && oppReplyParsed) {
    shapes.push({ orig: oppReplyParsed.from, dest: oppReplyParsed.to, brush: 'red' });
  }
  for (const h of newHangingOwn.slice(0, 2)) {
    vulnerableSquares.push(h.square);
    shapes.push({ orig: h.square, brush: 'red' });
  }
  if (forkByMover) {
    for (const t of forkByMover.targets) {
      shapes.push({ orig: parsedPlayed.to, dest: t.square, brush: 'yellow' });
    }
  }

  return {
    ply,
    moveNumber,
    mover,
    fenBefore,
    fenAfter,
    playedUci,
    playedSan,
    playedSanEs,
    classification,
    category: classification.category,
    scoreBefore,
    scoreAfter,
    depthBefore: analysisBefore.depth,
    depthAfter: analysisAfter.depth,
    bestUci,
    bestSan,
    bestSanEs,
    bestScore: scoreBefore,
    cpLoss: classification.cpLoss,
    effectiveLossCp: classification.effectiveLossCp,
    deltaText,
    whatHappened,
    consequences,
    whatYouDidWell,
    whatToWatch,
    bestAlternativeExplain,
    whatToConsider,
    recommendation,
    coachLesson,
    continuationLine,
    bestLine,
    equallyGoodMovesSan,
    equallyGoodNote,
    motifs,
    phase,
    shapes,
    vulnerableSquares,
    thinkTimeMs,
  };
}

