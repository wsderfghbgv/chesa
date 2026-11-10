/**
 * Entrenamiento con Retos de Aperturas (Requisito 8).
 *
 * Incluye los 8 tipos de retos exigidos:
 * - 'next-move': Encuentra el siguiente movimiento correcto.
 * - 'find-error': Identifica y castiga el error de una posición.
 * - 'best-reply': Encuentra la mejor respuesta del rival.
 * - 'trap': Identifica / refuta una trampa de apertura.
 * - 'plan': Encuentra el plan estratégico.
 * - 'recognize': Reconoce la apertura a partir de una posición.
 * - 'develop': Identifica qué pieza debe desarrollarse.
 * - 'continue-line': Encuentra la continuación de una variante.
 */
import { Chess, type Square } from 'chess.js';
import { COLOR_NAME, PIECE_NAME, localizeSan, moveToUci, other, type Color } from '../chess/utils';
import { OPENING_DEFS } from './library';
import { compileOpening } from './lessons';
import type { Arrow, Challenge, ChallengeOption, ChallengeType, CompiledOpening } from './types';

function replayMovesToBeforeAndSolution(
  movesStr: string,
  stopBeforePly: number,
): { fen: string; solutionUci: string; solutionSanEs: string; from: Square; to: Square; mover: Color } | null {
  const sans = movesStr.trim().split(/\s+/).filter(Boolean);
  if (stopBeforePly < 1 || stopBeforePly > sans.length) return null;
  const chess = new Chess();
  for (let i = 0; i < stopBeforePly - 1; i++) {
    try {
      chess.move(sans[i]);
    } catch {
      return null;
    }
  }
  const fen = chess.fen();
  try {
    const mv = chess.move(sans[stopBeforePly - 1]);
    return {
      fen,
      solutionUci: moveToUci(mv),
      solutionSanEs: localizeSan(mv.san, 'es'),
      from: mv.from,
      to: mv.to,
      mover: mv.color,
    };
  } catch {
    return null;
  }
}

/**
 * Construye retos estructurados de los 8 tipos a partir de una apertura compilada,
 * garantizando que las 37 aperturas de la biblioteca tengan retos verificados con chess.js.
 */
export function buildChallengesForOpening(opening: CompiledOpening): Challenge[] {
  const out: Challenge[] = [];
  const main = opening.compiled[0];
  const studyColor: Color = opening.studyAs ?? (opening.side === 'b' ? 'b' : 'w');

  // 1) 'next-move': Encuentra el siguiente movimiento teórico clave (jugada 4..6 del bando estudiado)
  const keyMove =
    main.moves.find((m) => m.mover === studyColor && m.ply >= 5 && m.ply <= 10) ??
    main.moves.find((m) => m.mover === studyColor) ??
    main.moves[0];

  if (keyMove) {
    const chess = new Chess(keyMove.fenBefore);
    const p = chess.get(keyMove.from);
    const pName = p ? PIECE_NAME[p.type] : 'pieza';
    out.push({
      id: `ch-next-${opening.id}`,
      type: 'next-move',
      openingId: opening.id,
      lineId: main.id,
      level: opening.level,
      statement: `En esta posición de la ${opening.name} (${opening.eco}), juega en el tablero el siguiente movimiento teórico principal de las ${COLOR_NAME[keyMove.mover]}.`,
      fen: keyMove.fenBefore,
      orientation: keyMove.mover,
      acceptedUci: [keyMove.uci],
      hints: [
        `Pista 1 (Objetivo): ${keyMove.teaching.why}`,
        `Pista 2 (Pieza y destino): Mueve tu ${pName} desde ${keyMove.from} hacia ${keyMove.to} (${keyMove.sanEs}).`,
      ],
      explanation: `¡Correcto! ${keyMove.sanEs} es la jugada teórica principal: ${keyMove.teaching.why} ${keyMove.teaching.consequence}`,
      points: 100,
      reveal: [{ orig: keyMove.from, dest: keyMove.to, brush: 'green' }],
      reviewKey: `${opening.id}|${keyMove.fenBefore.split(' ').slice(0, 4).join(' ')}`,
    });
  }

  // 2) 'trap' y 'find-error': A partir de la trampa real de la apertura
  const trap = opening.traps[0];
  if (trap) {
    const punishStep = replayMovesToBeforeAndSolution(trap.moves, trap.mistakePly + 1);
    if (punishStep) {
      out.push({
        id: `ch-trap-${opening.id}`,
        type: 'trap',
        openingId: opening.id,
        level: opening.level,
        statement: `¡Trampa de apertura (${trap.name})! Las ${COLOR_NAME[trap.victim]} acaban de cometer un grave error en la jugada anterior. Ejecuta en el tablero la jugada que inicia la refutación.`,
        fen: punishStep.fen,
        orientation: punishStep.mover,
        acceptedUci: [punishStep.solutionUci],
        hints: [
          `Pista 1: Observa qué punto táctico o pieza dejaron desprotegida las ${COLOR_NAME[trap.victim]}.`,
          `Pista 2: La refutación comienza con la jugada ${punishStep.solutionSanEs} (de ${punishStep.from} a ${punishStep.to}).`,
        ],
        explanation: `${trap.explanation}`,
        points: 140,
        reveal: [{ orig: punishStep.from, dest: punishStep.to, brush: 'green' }],
      });
    }

    // 'find-error': Identifica por qué la jugada de la víctima fue un error y cómo castigarlo
    const mistakeStep = replayMovesToBeforeAndSolution(trap.moves, trap.mistakePly);
    if (mistakeStep && punishStep) {
      const altOptions: ChallengeOption[] = [
        {
          id: 'err-true',
          label: `Fue un error jugar ${mistakeStep.solutionSanEs} porque permite la refutación táctica ${punishStep.solutionSanEs}.`,
          correct: true,
        },
        {
          id: 'err-false-1',
          label: `${mistakeStep.solutionSanEs} es la línea teórica principal y consolida el centro sin riesgos.`,
          correct: false,
        },
        {
          id: 'err-false-2',
          label: `El único problema de ${mistakeStep.solutionSanEs} es que dobla peones en un final de torres.`,
          correct: false,
        },
      ];
      out.push({
        id: `ch-error-${opening.id}`,
        type: 'find-error',
        openingId: opening.id,
        level: opening.level,
        statement: `Las ${COLOR_NAME[trap.victim]} acaban de jugar ${mistakeStep.solutionSanEs} llegando a esta posición. Identifica el diagnóstico correcto o ejecuta en el tablero el castigo ${punishStep.solutionSanEs}.`,
        fen: punishStep.fen,
        orientation: punishStep.mover,
        acceptedUci: [punishStep.solutionUci],
        options: altOptions,
        hints: [
          `Pista 1: Analiza la vulnerabilidad táctica que dejó ${mistakeStep.solutionSanEs}.`,
          `Pista 2: El golpe ${punishStep.solutionSanEs} castiga inmediatamente el error.`,
        ],
        explanation: `${trap.explanation}`,
        points: 120,
        reveal: [{ orig: punishStep.from, dest: punishStep.to, brush: 'red' }],
      });
    }
  }

  // 3) 'best-reply': Encuentra la mejor respuesta del rival (el bando contrario al principal)
  const oppColor = other(studyColor);
  const replyMove =
    main.moves.find((m) => m.mover === oppColor && m.ply >= 4 && m.ply <= 10) ??
    main.moves.find((m) => m.mover === oppColor);
  if (replyMove) {
    out.push({
      id: `ch-reply-${opening.id}`,
      type: 'best-reply',
      openingId: opening.id,
      lineId: main.id,
      level: opening.level,
      statement: `Ponte en el lugar del rival (${COLOR_NAME[oppColor]}) en la ${opening.short ?? opening.name}: ejecuta en el tablero la mejor respuesta teórica ante la última jugada.`,
      fen: replyMove.fenBefore,
      orientation: oppColor,
      acceptedUci: [replyMove.uci],
      hints: [
        `Pista 1: Piensa en el objetivo de las ${COLOR_NAME[oppColor]}: ${replyMove.teaching.why}`,
        `Pista 2: Juega ${replyMove.sanEs} (${replyMove.from} → ${replyMove.to}).`,
      ],
      explanation: `La mejor respuesta del rival es ${replyMove.sanEs}: ${replyMove.teaching.why}`,
      points: 110,
      reveal: [{ orig: replyMove.from, dest: replyMove.to, brush: 'blue' }],
    });
  }

  // 4) 'develop': Identifica qué pieza menor debe desarrollarse en los primeros compases
  const devMove =
    main.moves.find((m) => {
      const c = new Chess(m.fenBefore);
      const p = c.get(m.from);
      return p && (p.type === 'n' || p.type === 'b') && m.ply >= 2 && m.ply <= 8;
    }) ?? main.moves[1];
  if (devMove) {
    const c = new Chess(devMove.fenBefore);
    const p = c.get(devMove.from);
    const pLabel = p ? PIECE_NAME[p.type] : 'pieza menor';
    out.push({
      id: `ch-dev-${opening.id}`,
      type: 'develop',
      openingId: opening.id,
      lineId: main.id,
      level: 'basico',
      statement: `¿Qué pieza deben desarrollar las ${COLOR_NAME[devMove.mover]} en este momento de la ${opening.short ?? opening.name} y a qué casilla? Realiza la jugada en el tablero.`,
      fen: devMove.fenBefore,
      orientation: devMove.mover,
      acceptedUci: [devMove.uci],
      hints: [
        `Pista 1: Busca activar tu ${pLabel} de ${devMove.from} hacia su casilla ideal en esta apertura.`,
        `Pista 2: Desarrolla con ${devMove.sanEs} (${devMove.from} → ${devMove.to}).`,
      ],
      explanation: `¡Exacto! ${devMove.sanEs} activa tu ${pLabel} hacia la casilla clave: ${devMove.teaching.why}`,
      points: 95,
      reveal: [{ orig: devMove.from, dest: devMove.to, brush: 'green' }],
    });
  }

  // 5) 'continue-line': Encuentra la continuación de una variante secundaria
  const secLine = opening.compiled[1] ?? main;
  const branchMove = secLine.moves[Math.min(secLine.moves.length - 1, 6)] ?? secLine.moves[secLine.moves.length - 1];
  if (branchMove) {
    out.push({
      id: `ch-cont-${opening.id}`,
      type: 'continue-line',
      openingId: opening.id,
      lineId: secLine.id,
      level: opening.level,
      statement: `Estás jugando la variante «${secLine.name}» (${secLine.eco}). Ejecuta en el tablero la continuación correcta de las ${COLOR_NAME[branchMove.mover]}.`,
      fen: branchMove.fenBefore,
      orientation: branchMove.mover,
      acceptedUci: [branchMove.uci],
      hints: [
        `Pista 1: Idea de la variante: ${secLine.idea || branchMove.teaching.why}`,
        `Pista 2: Continúa la línea con ${branchMove.sanEs} (${branchMove.from} → ${branchMove.to}).`,
      ],
      explanation: `En la variante «${secLine.name}», la continuación exacta es ${branchMove.sanEs}: ${branchMove.teaching.why}`,
      points: 115,
      reveal: [{ orig: branchMove.from, dest: branchMove.to, brush: 'green' }],
    });
  }

  // 6) 'plan': Encuentra el plan estratégico correcto en la tabiya de la apertura
  const tabiyaFen = main.fens[Math.min(main.fens.length - 1, 10)];
  const otherDefs = OPENING_DEFS.filter((d) => d.id !== opening.id && d.category !== opening.category);
  const distractor1 = otherDefs[0]?.plans.w[0] ?? 'Lanzar los peones de a2 y h2 en la primera jugada sin enrocar.';
  const distractor2 = otherDefs[1]?.plans.b[0] ?? 'Cambiar todas las piezas menores sin abrir ninguna columna.';
  const correctPlan = opening.plans[studyColor][0];

  out.push({
    id: `ch-plan-${opening.id}`,
    type: 'plan',
    openingId: opening.id,
    lineId: main.id,
    level: opening.level,
    statement: `Observa la estructura típica de la ${opening.name} (${opening.eco}). ¿Cuál es el plan estratégico fundamental de las ${COLOR_NAME[studyColor]} a partir de esta posición?`,
    fen: tabiyaFen,
    orientation: studyColor,
    options: [
      { id: 'plan-ok', label: correctPlan, correct: true },
      { id: 'plan-d1', label: distractor1, correct: false },
      { id: 'plan-d2', label: distractor2, correct: false },
    ],
    hints: [
      `Pista 1: Fíjate en las casillas clave de la apertura (${opening.keySquares.map((k) => k.square).join(', ')}).`,
      `Pista 2: Recuerda la estructura: ${opening.structures[0]}`,
    ],
    explanation: `El plan maestro de las ${COLOR_NAME[studyColor]} en la ${opening.name} es: ${opening.plans[studyColor].join(' ')}`,
    points: 110,
    reveal: main.moves[Math.min(main.moves.length - 1, 9)]?.teaching.arrows ?? ([] as Arrow[]),
  });

  // 7) 'recognize': Reconoce la apertura a partir de su posición característica
  const recMoveIdx = Math.min(main.moves.length - 1, 5);
  const recMove = main.moves[recMoveIdx];
  const distOpenings = OPENING_DEFS.filter((d) => d.id !== opening.id).slice(0, 2);

  out.push({
    id: `ch-rec-${opening.id}`,
    type: 'recognize',
    openingId: opening.id,
    lineId: main.id,
    level: opening.level,
    statement: `Observa la disposición de peones y piezas en el tablero. ¿A qué apertura y código ECO pertenece esta posición teórica?`,
    fen: recMove.fenAfter,
    orientation: studyColor,
    options: [
      { id: `rec-${opening.id}`, label: `${opening.name} (${opening.eco})`, correct: true },
      {
        id: `rec-${distOpenings[0]?.id ?? 'd1'}`,
        label: `${distOpenings[0]?.name ?? 'Defensa Siciliana'} (${distOpenings[0]?.eco ?? 'B90'})`,
        correct: false,
      },
      {
        id: `rec-${distOpenings[1]?.id ?? 'd2'}`,
        label: `${distOpenings[1]?.name ?? 'Sistema Londres'} (${distOpenings[1]?.eco ?? 'D02'})`,
        correct: false,
      },
    ],
    hints: [
      `Pista 1: Pertenece a la categoría de aperturas «${opening.category}» y su código ECO es ${opening.eco}.`,
      `Pista 2: ${opening.goals[0]}`,
    ],
    explanation: `Se trata de la ${opening.name} (${opening.eco}): ${opening.history.split('.')[0]}.`,
    points: 90,
  });

  return out;
}

let allChallengesCache: Challenge[] | null = null;

export function getAllChallenges(): Challenge[] {
  if (allChallengesCache) return allChallengesCache;
  const list: Challenge[] = [];
  for (const def of OPENING_DEFS) {
    const compiled = compileOpening(def);
    list.push(...buildChallengesForOpening(compiled));
  }
  allChallengesCache = list;
  return list;
}

export function getChallengesFiltered(filter: {
  openingId?: string;
  type?: ChallengeType | 'all';
}): Challenge[] {
  const all = getAllChallenges();
  return all.filter((c) => {
    if (filter.openingId && filter.openingId !== 'all' && c.openingId !== filter.openingId) return false;
    if (filter.type && filter.type !== 'all' && c.type !== filter.type) return false;
    return true;
  });
}

/**
 * Evalúa la respuesta del usuario (por jugada en el tablero o por opción múltiple).
 */
export function evaluateChallengeAttempt(
  challenge: Challenge,
  attempt: { uci?: string; optionId?: string },
): { correct: boolean; message: string; pointsAwarded: number } {
  if (attempt.uci && challenge.acceptedUci?.length) {
    const isOk = challenge.acceptedUci.includes(attempt.uci);
    return {
      correct: isOk,
      message: isOk
        ? `¡Correcto! ${challenge.explanation}`
        : `Esa jugada no resuelve el reto. Revisa las pistas o inténtalo de nuevo en el tablero.`,
      pointsAwarded: isOk ? challenge.points : 0,
    };
  }
  if (attempt.optionId && challenge.options?.length) {
    const opt = challenge.options.find((o) => o.id === attempt.optionId);
    const isOk = Boolean(opt?.correct);
    return {
      correct: isOk,
      message: isOk
        ? `¡Respuesta exacta! ${challenge.explanation}`
        : `Opción incorrecta. Analiza la estructura de peones y vuelve a intentarlo.`,
      pointsAwarded: isOk ? challenge.points : 0,
    };
  }
  return { correct: false, message: 'Selecciona una respuesta o realiza un movimiento en el tablero.', pointsAwarded: 0 };
}

