/**
 * Modo Práctica: «Juega la Apertura» (Requisito 6).
 *
 * Permite practicar cualquier apertura con Blancas o Negras en tres niveles de dificultad,
 * haciendo que el rival elija entre distintas respuestas teóricas del árbol de la apertura
 * para evitar la memorización mecánica de una única secuencia.
 *
 * Cuando el usuario comete un error, genera un diagnóstico pedagógico completo:
 * - Por qué su jugada no es la esperada.
 * - Cuál era la jugada recomendada y su razonamiento estratégico.
 * - Qué consecuencias tiene el error (posicionales y tácticas).
 * - Pistas progresivas (pista conceptual → pista visual en el tablero).
 */
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { development, hangingPieces, threatsOf } from '../chess/features';
import { COLOR_NAME, PIECE_NAME, localizeSan, moveToUci, other, pieceAt, type Color } from '../chess/utils';
import { buildTree, orderedChildren } from './tree';
import type { Arrow, CompiledLine, CompiledMove, CompiledOpening, TreeNode } from './types';

export type PracticeDifficulty = 'guiado' | 'variado' | 'maestro';

export const PRACTICE_DIFFICULTY_LABELS: Record<
  PracticeDifficulty,
  { title: string; subtitle: string; badge: string }
> = {
  guiado: {
    title: 'Guiado (Principiante)',
    subtitle: 'Sigue la variante elegida con ayudas conceptuales disponibles en cada turno.',
    badge: 'Nivel 1',
  },
  variado: {
    title: 'Rival Variado (Intermedio)',
    subtitle: 'El rival alterna entre distintas respuestas teóricas de la apertura para evitar que memorices una sola línea.',
    badge: 'Nivel 2',
  },
  maestro: {
    title: 'Examen de Maestro (Avanzado)',
    subtitle: 'Sin pistas automáticas; el rival elige cualquier rama del árbol teórico y exige precisión total.',
    badge: 'Nivel 3',
  },
};

export interface PracticeFeedback {
  kind: 'correct' | 'alternative_book' | 'mistake' | 'completed';
  playedSanEs: string;
  playedUci: string;
  expectedSanEs: string;
  expectedUci: string;
  headline: string;
  whyWrongOrRight: string;
  recommendedExplanation: string;
  consequences: string;
  arrows: Arrow[];
  highlights: Square[];
}

export interface PracticeHint {
  level: 1 | 2;
  text: string;
  arrows: Arrow[];
  highlights: Square[];
}

export interface PracticeState {
  openingId: string;
  targetLineId: string;
  playerColor: Color;
  difficulty: PracticeDifficulty;
  fen: string;
  uciHistory: string[];
  sanEsHistory: string[];
  nodeKey: string;
  mistakesCount: number;
  correctCount: number;
  hintsUsed: number;
  currentHintLevel: 0 | 1 | 2;
  completed: boolean;
  lastFeedback: PracticeFeedback | null;
  lastOpponentMove: { sanEs: string; uci: string; explanation: string; variantName: string } | null;
}

function findCompiledMove(
  opening: CompiledOpening,
  fenBefore: string,
  uci: string,
): { move: CompiledMove; line: CompiledLine } | null {
  const fk = fenBefore.split(' ').slice(0, 4).join(' ');
  for (const line of opening.compiled) {
    for (const mv of line.moves) {
      if (mv.uci === uci && mv.fenBefore.split(' ').slice(0, 4).join(' ') === fk) {
        return { move: mv, line };
      }
    }
  }
  return null;
}

/**
 * Selecciona la respuesta del rival desde el nodo actual del árbol según la dificultad:
 * - 'guiado': prioriza la línea seleccionada (`targetLineId`) o la principal.
 * - 'variado' / 'maestro': puede elegir entre cualquiera de los hijos teóricos disponibles para variar.
 */
export function chooseOpponentBookNode(
  node: TreeNode,
  targetLineId: string,
  difficulty: PracticeDifficulty,
  rng: () => number = Math.random,
): TreeNode | null {
  const children = orderedChildren(node);
  if (!children.length) return null;
  if (children.length === 1) return children[0];

  if (difficulty === 'guiado') {
    return children.find((c) => c.lineIds.includes(targetLineId)) ?? children[0];
  }

  // En 'variado' y 'maestro' elegimos entre todas las continuaciones teóricas (excluyendo trampas donde el rival se deja material si hay otras)
  const idx = Math.min(children.length - 1, Math.floor(rng() * children.length));
  return children[idx];
}

/**
 * Inicializa una sesión de práctica para la apertura, color y dificultad elegidos.
 * Si el usuario elige Negras, ejecuta automáticamente el primer movimiento de las Blancas.
 */
export function createPracticeSession(
  opening: CompiledOpening,
  playerColor: Color,
  difficulty: PracticeDifficulty = 'variado',
  targetLineId?: string,
  rng: () => number = Math.random,
): PracticeState {
  const lineId = targetLineId ?? opening.compiled[0].id;
  const tree = buildTree(opening);
  let node = tree.root;
  const uciHistory: string[] = [];
  const sanEsHistory: string[] = [];
  let lastOpponentMove: PracticeState['lastOpponentMove'] = null;

  // Si le toca al rival en el inicio (usuario juega con negras), el rival realiza su primera jugada
  if (playerColor === 'b') {
    const oppNode = chooseOpponentBookNode(node, lineId, difficulty, rng);
    if (oppNode) {
      const info = findCompiledMove(opening, node.fen, oppNode.uci);
      uciHistory.push(oppNode.uci);
      sanEsHistory.push(oppNode.sanEs);
      lastOpponentMove = {
        sanEs: oppNode.sanEs,
        uci: oppNode.uci,
        explanation: info?.move.teaching.why ?? 'El rival inicia la apertura ocupando el centro.',
        variantName: info?.line.name ?? opening.name,
      };
      node = oppNode;
    }
  }

  return {
    openingId: opening.id,
    targetLineId: lineId,
    playerColor,
    difficulty,
    fen: node.fen,
    uciHistory,
    sanEsHistory,
    nodeKey: node.key,
    mistakesCount: 0,
    correctCount: 0,
    hintsUsed: 0,
    currentHintLevel: 0,
    completed: node.children.length === 0,
    lastFeedback: null,
    lastOpponentMove,
  };
}

/**
 * Analiza por qué un movimiento incorrecto del usuario falla en comparación con la jugada teórica.
 */
function explainWhyMoveIsWrong(
  fenBefore: string,
  playedFrom: Square,
  playedTo: Square,
  playedPromotion: PieceSymbol | undefined,
  expectedMove: CompiledMove,
  opening: CompiledOpening,
): { whyWrong: string; consequences: string; arrows: Arrow[]; highlights: Square[] } {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  const mv = after.move({ from: playedFrom, to: playedTo, promotion: playedPromotion });
  const mover = mv.color;
  const rival = other(mover);
  const playedSanEs = localizeSan(mv.san, 'es');

  const reasons: string[] = [];
  const consequencesList: string[] = [];

  // 1) ¿Dejó una pieza colgada o permite una captura ganadora inmediata?
  const rivalThreats = threatsOf(after, rival);
  const hung = hangingPieces(after, mover);
  if (rivalThreats.length > 0 && rivalThreats[0].target) {
    const t = rivalThreats[0];
    consequencesList.push(
      `Tácticamente permite al rival responder ${localizeSan(t.san, 'es')} capturando ${pieceAt(t.target!.type, t.target!.square)}.`,
    );
  } else if (hung.length > 0) {
    consequencesList.push(`Deja ${pieceAt(hung[0].type, hung[0].square)} expuesto y sin suficiente defensa.`);
  }

  // 2) Comparar qué pieza movió frente a la pieza teórica
  if (mv.piece === 'q' && expectedMove.from !== playedFrom) {
    reasons.push(
      `Has sacado la dama prematuramente con ${playedSanEs} en lugar de priorizar el desarrollo y el control central.`,
    );
    consequencesList.push(
      `La dama expuesta puede ser atacada por las piezas menores rivales ganando tiempos de desarrollo.`,
    );
  } else if (mv.piece === 'p' && ['a', 'h'].includes(mv.from[0]) && !['a', 'h'].includes(expectedMove.from[0])) {
    reasons.push(
      `${playedSanEs} es un avance de peón lateral en el borde del tablero que no contribuye a la lucha por el centro ni al desarrollo rápido.`,
    );
  } else if (
    mv.piece === 'p' &&
    ((mover === 'w' && mv.to === 'e3' && before.get('c1')?.type === 'b') ||
      (mover === 'b' && mv.to === 'e6' && before.get('c8')?.type === 'b')) &&
    expectedMove.to !== mv.to
  ) {
    reasons.push(
      `Avanzar ${playedSanEs} ahora mismo encierra tu propio alfil de dama dentro de la cadena de peones antes de tiempo.`,
    );
  } else {
    const devBefore = development(before, mover).undevelopedMinors;
    const devAfter = development(after, mover).undevelopedMinors;
    if (devBefore === devAfter && expectedMove.teaching.why) {
      reasons.push(
        `Tu jugada ${playedSanEs} no cumple el objetivo prioritario de la posición en la ${opening.short ?? opening.name}.`,
      );
    } else {
      reasons.push(
        `Aunque ${playedSanEs} es una jugada legal, se desvía del plan estratégico de la ${opening.short ?? opening.name} en este momento.`,
      );
    }
  }

  consequencesList.push(
    `Al no jugar ${expectedMove.sanEs}, cedes la iniciativa en las casillas clave (${expectedMove.teaching.controlledSquares.slice(0, 3).join(', ') || expectedMove.to}) y facilitas el plan del rival (${ (rival === 'w' ? opening.plans.w : opening.plans.b)[0] ?? 'igualar el centro' }).`,
  );

  const arrows: Arrow[] = [
    { orig: playedFrom, dest: playedTo, brush: 'red' },
    { orig: expectedMove.from, dest: expectedMove.to, brush: 'green' },
  ];

  return {
    whyWrong: reasons.join(' '),
    consequences: consequencesList.join(' '),
    arrows,
    highlights: [expectedMove.from, expectedMove.to],
  };
}

/**
 * Procesa el intento de jugada del usuario en el Modo Práctica.
 */
export function submitPracticeMove(
  state: PracticeState,
  opening: CompiledOpening,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
  rng: () => number = Math.random,
): { nextState: PracticeState; accepted: boolean } {
  if (state.completed) {
    return { nextState: state, accepted: false };
  }

  const chess = new Chess(state.fen);
  let mv;
  try {
    mv = chess.move({ from, to, promotion: promotion ?? 'q' });
  } catch {
    return { nextState: state, accepted: false };
  }
  if (!mv) return { nextState: state, accepted: false };

  const playedUci = moveToUci(mv);
  const playedSanEs = localizeSan(mv.san, 'es');

  const tree = buildTree(opening);
  const currentNode = tree.byId.get(state.nodeKey) ?? tree.root;
  const children = orderedChildren(currentNode);

  // La jugada esperada principal (de la línea objetivo o la primera del nodo)
  const preferredChild =
    children.find((c) => c.lineIds.includes(state.targetLineId)) ?? children[0];

  if (!preferredChild) {
    return { nextState: { ...state, completed: true }, accepted: false };
  }

  // ¿El usuario jugó exactamente una de las jugadas teóricas del árbol de esta apertura?
  const matchedChild =
    state.difficulty === 'guiado'
      ? children.find((c) => c.uci === playedUci && c.lineIds.includes(state.targetLineId)) ??
        children.find((c) => c.uci === playedUci)
      : children.find((c) => c.uci === playedUci);

  const expectedInfo = findCompiledMove(opening, state.fen, preferredChild.uci);
  const expectedMove: CompiledMove =
    expectedInfo?.move ??
    opening.compiled[0].moves[Math.min(opening.compiled[0].moves.length - 1, currentNode.ply)]!;

  // CASO 1: JUGADA INCORRECTA (fuera del repertorio de la apertura)
  if (!matchedChild) {
    const diag = explainWhyMoveIsWrong(state.fen, from, to, mv.promotion, expectedMove, opening);
    const feedback: PracticeFeedback = {
      kind: 'mistake',
      playedSanEs,
      playedUci,
      expectedSanEs: preferredChild.sanEs,
      expectedUci: preferredChild.uci,
      headline: `Jugada imprecisa: jugaste ${playedSanEs}, pero la teoría pide ${preferredChild.sanEs}`,
      whyWrongOrRight: diag.whyWrong,
      recommendedExplanation: `La jugada recomendada es ${preferredChild.sanEs}: ${expectedMove.teaching.why}`,
      consequences: diag.consequences,
      arrows: diag.arrows,
      highlights: diag.highlights,
    };

    return {
      accepted: false,
      nextState: {
        ...state,
        mistakesCount: state.mistakesCount + 1,
        lastFeedback: feedback,
      },
    };
  }

  // CASO 2: JUGADA CORRECTA (coincide con la línea principal o con una variante válida de la apertura)
  const matchedInfo = findCompiledMove(opening, state.fen, matchedChild.uci);
  const matchedCompileMove = matchedInfo?.move ?? expectedMove;
  const isAlternativeBranch = matchedChild.uci !== preferredChild.uci;

  let nextNode = matchedChild;
  const nextUciHistory = [...state.uciHistory, matchedChild.uci];
  const nextSanEsHistory = [...state.sanEsHistory, matchedChild.sanEs];
  let nextOpponentMove: PracticeState['lastOpponentMove'] = null;

  // Si quedan movimientos en el árbol, el rival responde automáticamente
  const oppChild = chooseOpponentBookNode(nextNode, state.targetLineId, state.difficulty, rng);
  if (oppChild) {
    const oppInfo = findCompiledMove(opening, nextNode.fen, oppChild.uci);
    nextUciHistory.push(oppChild.uci);
    nextSanEsHistory.push(oppChild.sanEs);
    nextOpponentMove = {
      sanEs: oppChild.sanEs,
      uci: oppChild.uci,
      explanation:
        oppInfo?.move.teaching.why ??
        `Las ${COLOR_NAME[oppChild.mover]} continúan el desarrollo dentro de la variante.`,
      variantName: oppInfo?.line.name ?? opening.name,
    };
    nextNode = oppChild;
  }

  const isCompleted = nextNode.children.length === 0;

  const feedback: PracticeFeedback = {
    kind: isCompleted ? 'completed' : isAlternativeBranch ? 'alternative_book' : 'correct',
    playedSanEs,
    playedUci,
    expectedSanEs: matchedChild.sanEs,
    expectedUci: matchedChild.uci,
    headline: isCompleted
      ? `¡Secuencia de ${opening.short ?? opening.name} completada con éxito!`
      : isAlternativeBranch
        ? `¡Bien! ${playedSanEs} es una variante teórica válida (${matchedInfo?.line.name ?? 'secundaria'})`
        : `¡Excelente! ${playedSanEs} es la jugada teórica exacta`,
    whyWrongOrRight: matchedCompileMove.teaching.why,
    recommendedExplanation: matchedCompileMove.teaching.consequence,
    consequences: nextOpponentMove
      ? `Tu rival responde con ${nextOpponentMove.sanEs} (${nextOpponentMove.variantName}): ${nextOpponentMove.explanation}`
      : 'Has llegado al final de esta línea teórica con una posición sólida.',
    arrows: matchedCompileMove.teaching.arrows,
    highlights: matchedCompileMove.teaching.highlights,
  };

  return {
    accepted: true,
    nextState: {
      ...state,
      fen: nextNode.fen,
      uciHistory: nextUciHistory,
      sanEsHistory: nextSanEsHistory,
      nodeKey: nextNode.key,
      correctCount: state.correctCount + 1,
      currentHintLevel: 0,
      completed: isCompleted,
      lastFeedback: feedback,
      lastOpponentMove: nextOpponentMove,
    },
  };
}

/**
 * Genera una pista progresiva (nivel 1: conceptual; nivel 2: flecha exacta en el tablero) para el turno actual.
 */
export function requestPracticeHint(
  state: PracticeState,
  opening: CompiledOpening,
): { nextState: PracticeState; hint: PracticeHint | null } {
  const tree = buildTree(opening);
  const currentNode = tree.byId.get(state.nodeKey) ?? tree.root;
  const children = orderedChildren(currentNode);
  const preferredChild =
    children.find((c) => c.lineIds.includes(state.targetLineId)) ?? children[0];
  if (!preferredChild) return { nextState: state, hint: null };

  const info = findCompiledMove(opening, state.fen, preferredChild.uci);
  const chess = new Chess(state.fen);
  const fromSq = preferredChild.uci.slice(0, 2) as Square;
  const toSq = preferredChild.uci.slice(2, 4) as Square;
  const piece = chess.get(fromSq);
  const pieceLabel = piece ? PIECE_NAME[piece.type] : 'pieza';

  const nextLevel: 1 | 2 = state.currentHintLevel === 0 ? 1 : 2;

  const hint: PracticeHint =
    nextLevel === 1
      ? {
          level: 1,
          text: `Pista 1 (Idea estratégica): Fíjate en tu ${pieceLabel} de la casilla ${fromSq}. Objetivo: ${
            info?.move.teaching.why ?? opening.goals[0]
          }`,
          arrows: [],
          highlights: [fromSq],
        }
      : {
          level: 2,
          text: `Pista 2 (Jugada recomendada): Mueve tu ${pieceLabel} de ${fromSq} a ${toSq} (${preferredChild.sanEs}). ${
            info?.move.teaching.consequence ?? ''
          }`,
          arrows: [{ orig: fromSq, dest: toSq, brush: 'green' }],
          highlights: [fromSq, toSq],
        };

  return {
    hint,
    nextState: {
      ...state,
      hintsUsed: state.hintsUsed + 1,
      currentHintLevel: nextLevel,
    },
  };
}

