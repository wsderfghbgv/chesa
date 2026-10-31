/**
 * Informe completo post-partida (Etapa 7) y Plan de Entrenamiento Personalizado (Etapa 10).
 *
 * Distingue explícitamente entre errores aislados (una sola ocurrencia) y patrones
 * recurrentes (repetidos a lo largo de la partida o del historial de partidas guardadas).
 */
import type { Color } from '../chess/utils';
import { detectOpening, type OpeningEntry } from '../chess/openings';
import { type MoveCategory, winProbability } from './classify';
import { type MoveEvaluation, type MotifId, MOTIF_LABELS } from './explain';
import { type CoachingPuzzle, selectPuzzlesForMotifs } from './puzzles';
import { cpFor } from '../engine/score';

export type CategoryCounts = Record<MoveCategory, number>;

export interface WeaknessEntry {
  motif: MotifId;
  label: string;
  countInGame: number;
  countHistorical: number;
  totalOccurrences: number;
  /** true solo si se ha repetido (>= 2 veces en la partida o >= 3 sumando historial). */
  isRecurringPattern: boolean;
  patternNote: string;
  studyAdvice: string;
}

export interface VerificationChallenge {
  title: string;
  fromOwnGame: boolean;
  fen: string;
  playerColor: Color;
  solutionUci: string[];
  solutionSanEs: string;
  playedWrongSanEs?: string;
  prompt: string;
  explanation: string;
}

export interface TrainingPlan {
  topThreeWeaknesses: WeaknessEntry[];
  conceptsToStudy: string[];
  recommendedPuzzles: CoachingPuzzle[];
  nextGameObjectives: string[];
  verificationChallenge: VerificationChallenge;
}

export interface PostGameReport {
  result: '1-0' | '0-1' | '1/2-1/2';
  outcomeForPlayer: 'win' | 'loss' | 'draw';
  reasonText: string;
  playerColor: Color;
  opening: OpeningEntry | null;
  totalPlies: number;
  totalFullMoves: number;
  playerMoveCount: number;
  counts: CategoryCounts;
  /** Suma de jugadas positivas (excelente + mejor + precisa + buena). */
  goodMovesTotal: number;
  /** Precisión media (0–100 %) calculada sobre la caída de probabilidad de victoria por jugada. */
  accuracyPercent: number;
  /** Pérdida media en centipeones (ACPL). */
  averageCpLoss: number;
  methodologyNote: string;
  bestMoves: MoveEvaluation[];
  criticalMistakes: MoveEvaluation[];
  missedOpportunities: MoveEvaluation[];
  decisiveMoments: MoveEvaluation[];
  strategicIssues: string[];
  strengths: string[];
  priorityImprovements: string[];
  trainingPlan: TrainingPlan;
}

const STUDY_BY_MOTIF: Record<MotifId, { concept: string; advice: string; objective: string }> = {
  pieza_indefensa: {
    concept: 'Seguridad de piezas y relación atacantes/defensores (LPDO: Loose Pieces Drop Off).',
    advice: 'Antes de confirmar cualquier jugada, comprueba que ninguna pieza propia quede sin defensa o atacada por una pieza de menor valor.',
    objective: 'Terminar la próxima partida sin dejar ninguna pieza menor o mayor colgada en un solo movimiento.',
  },
  amenaza_ignorada: {
    concept: 'Detección sistemática de amenazas del rival y jugadas profilácticas.',
    advice: 'Adopta el hábito de preguntarte tras cada movimiento rival: «¿Qué amenaza si volviera a mover él?».',
    objective: 'Identificar la intención de cada jugada del rival antes de elegir tu respuesta.',
  },
  ataque_doble: {
    concept: 'Geometría de horquillas de caballo, peón y dama.',
    advice: 'Vigila las casillas desde las que un caballo o la dama puedan atacar dos piezas sin sostén a la vez.',
    objective: 'Buscar activamente ataques dobles cuando el rival tenga dos piezas sueltas.',
  },
  clavada: {
    concept: 'Alineación en columnas y diagonales (clavadas absolutas y relativas).',
    advice: 'Evita situar el rey y la dama o torres en la misma línea sin peones interpuestos, y presiona con peones las piezas que hayas clavado.',
    objective: 'Retirar al rey o romper cualquier clavada antes de que el rival sume un segundo atacante.',
  },
  descubierta: {
    concept: 'Ataques y jaques a la descubierta mediante baterías lineales.',
    advice: 'Desconfía cuando una pieza tuya de valor esté en la misma línea que un alfil o torre rival detrás de otra pieza.',
    objective: 'Detectar rayos X enemigos sobre tu rey o dama y apartarte con tiempo.',
  },
  sobrecarga_desviacion: {
    concept: 'Piezas defensoras sobrecargadas y tema de la desviación.',
    advice: 'No confíes dos tareas defensivas críticas a una sola pieza.',
    objective: 'Repartir la defensa de puntos clave entre varias piezas o peones.',
  },
  sacrificio: {
    concept: 'Cálculo de sacrificios tácticos contra el enroque y puntos vulnerables (f2/f7, h7).',
    advice: 'Valida siempre un sacrificio calculando todas las respuestas defensivas forzadas del rival.',
    objective: 'Calcular hasta el final de la variante forzada antes de entregar material.',
  },
  control_centro: {
    concept: 'Ocupación y presión sobre el centro clásico (d4, e4, d5, e5).',
    advice: 'Usa tus peones centrales y piezas menores para disputar las cuatro casillas centrales desde el inicio.',
    objective: 'Colocar al menos un peón en el centro y sostenerlo con piezas en las primeras 8 jugadas.',
  },
  desarrollo: {
    concept: 'Principios de desarrollo en la apertura y economía de tiempos.',
    advice: 'Saca caballos y alfiles antes que la dama, no muevas dos veces la misma pieza en la apertura sin motivo táctico y enroca pronto.',
    objective: 'Completar el desarrollo de las 4 piezas menores y el enroque antes de la jugada 12.',
  },
  seguridad_rey: {
    concept: 'Seguridad del rey, escudo de peones y debilidad de la primera/octava fila.',
    advice: 'Enroca a tiempo y evita avanzar innecesariamente los peones delante de tu rey enrocado.',
    objective: 'Enrocar antes de abrir el centro y mantener siempre una casilla de escape en el medio juego tardío.',
  },
  estructura_peones: {
    concept: 'Peones pasados, aislados y doblados.',
    advice: 'Cada avance de peón es irreversible: evalúa qué casillas deja débiles a su paso.',
    objective: 'Evitar crear peones aislados o doblados sin obtener a cambio columnas abiertas o actividad.',
  },
  casillas_debiles: {
    concept: 'Puestos avanzados y control de complejos de color.',
    advice: 'Instala tus caballos en casillas centrales que ningún peón rival pueda expulsar.',
    objective: 'Identificar y ocupar al menos una casilla fuerte en campo enemigo.',
  },
  actividad_piezas: {
    concept: 'Actividad de piezas, columnas abiertas y mejora de la peor pieza.',
    advice: 'Cuando no haya táctica inmediata, localiza tu pieza menos activa y tráela al juego.',
    objective: 'Conectar las torres y situarlas en las columnas abiertas o semiabiertas.',
  },
  plan_estrategico: {
    concept: 'Formulación de planes según la estructura de peones.',
    advice: 'Juega en el flanco donde tengas ventaja de espacio o mayoría de peones.',
    objective: 'Seguir el plan típico de la apertura elegida tras completar el desarrollo.',
  },
  finales: {
    concept: 'Técnica de finales: centralización del rey, oposición y creación de peones pasados.',
    advice: 'En el final el rey es una pieza de ataque: llévalo al centro de inmediato y empuja los peones pasados con apoyo.',
    objective: 'Activar el rey hacia el centro en cuanto se cambien las damas.',
  },
  gestion_tiempo: {
    concept: 'Gestión del reloj: invertir tiempo en posiciones críticas y jugar rápido las rutinarias.',
    advice: 'No juegues al toque en posiciones con tensión táctica ni consumas todo tu reloj en decisiones equivalentes.',
    objective: 'Dedicar al menos 8–15 segundos a revisar amenazas en los momentos de tensión táctica.',
  },
};

export interface BuildReportInput {
  result: '1-0' | '0-1' | '1/2-1/2';
  reasonText: string;
  playerColor: Color;
  fens: string[];
  evaluations: MoveEvaluation[];
  /** Conteo acumulado de motivos de error en partidas anteriores del jugador. */
  historicalMistakeMotifs?: Partial<Record<MotifId, number>>;
}

export function buildPostGameReport(input: BuildReportInput): PostGameReport {
  const { result, reasonText, playerColor, fens, evaluations, historicalMistakeMotifs = {} } = input;

  const outcomeForPlayer: 'win' | 'loss' | 'draw' =
    result === '1/2-1/2'
      ? 'draw'
      : (result === '1-0' && playerColor === 'w') || (result === '0-1' && playerColor === 'b')
        ? 'win'
        : 'loss';

  const opening = detectOpening(fens);
  const playerEvals = evaluations.filter((e) => e.mover === playerColor);

  const counts: CategoryCounts = {
    excelente: 0,
    mejor: 0,
    precisa: 0,
    buena: 0,
    oportunidad_perdida: 0,
    imprecision: 0,
    error: 0,
    error_grave: 0,
  };
  for (const e of playerEvals) counts[e.category]++;

  const goodMovesTotal = counts.excelente + counts.mejor + counts.precisa + counts.buena;

  const accuracyPercent =
    playerEvals.length > 0
      ? Math.round(playerEvals.reduce((acc, e) => acc + e.classification.moveAccuracy, 0) / playerEvals.length)
      : 100;

  const averageCpLoss =
    playerEvals.length > 0
      ? Math.round(playerEvals.reduce((acc, e) => acc + e.cpLoss, 0) / playerEvals.length)
      : 0;

  const methodologyNote =
    'La precisión (0–100 %) mide cuánto conservaste la expectativa de victoria según Stockfish en cada turno, ' +
    'y la pérdida media (ACPL) promedia los centipeones cedidos respecto a la mejor jugada del motor. ' +
    'Son indicadores de calidad de movimiento en esta partida concreta, NO un Elo oficial.';

  // Mejores jugadas del jugador (priorizando Excelentes y Mejores con ganancia o en posiciones complejas).
  const bestMoves = [...playerEvals]
    .filter((e) => e.classification.meta.isPositive)
    .sort((a, b) => {
      const rank = (c: MoveCategory) => (c === 'excelente' ? 4 : c === 'mejor' ? 3 : c === 'precisa' ? 2 : 1);
      return rank(b.category) - rank(a.category) || a.cpLoss - b.cpLoss;
    })
    .slice(0, 3);

  // Errores que más influyeron en el resultado.
  const criticalMistakes = [...playerEvals]
    .filter((e) => e.category === 'error_grave' || e.category === 'error' || e.category === 'imprecision')
    .sort((a, b) => b.effectiveLossCp - a.effectiveLossCp)
    .slice(0, 4);

  // Oportunidades tácticas desaprovechadas.
  const missedOpportunities = playerEvals.filter((e) => e.category === 'oportunidad_perdida');

  // Momentos decisivos (mayor cambio de probabilidad de victoria en toda la partida).
  const decisiveMoments = [...evaluations]
    .sort((a, b) => {
      const dropA = Math.abs(
        winProbability(cpFor(a.scoreBefore, a.mover)) - winProbability(cpFor(a.scoreAfter, a.mover)),
      );
      const dropB = Math.abs(
        winProbability(cpFor(b.scoreBefore, b.mover)) - winProbability(cpFor(b.scoreAfter, b.mover)),
      );
      return dropB - dropA;
    })
    .slice(0, 3);

  // Conteo de motivos en errores vs en aciertos.
  const mistakeMotifCount = new Map<MotifId, number>();
  const positiveMotifCount = new Map<MotifId, number>();
  const phaseMistakes: Record<'apertura' | 'medio juego' | 'final', number> = {
    apertura: 0,
    'medio juego': 0,
    final: 0,
  };

  for (const e of playerEvals) {
    if (e.classification.meta.isMistake) {
      phaseMistakes[e.phase]++;
      for (const m of e.motifs) {
        mistakeMotifCount.set(m, (mistakeMotifCount.get(m) ?? 0) + 1);
      }
    } else {
      for (const m of e.motifs) {
        positiveMotifCount.set(m, (positiveMotifCount.get(m) ?? 0) + 1);
      }
    }
  }

  // Problemas estratégicos detectados.
  const strategicIssues: string[] = [];
  if (phaseMistakes.apertura >= 2) {
    strategicIssues.push(
      `Dificultades en la apertura (${phaseMistakes.apertura} imprecisiones/errores en las primeras jugadas): prioriza desarrollo rápido y enroque.`,
    );
  }
  if ((mistakeMotifCount.get('estructura_peones') ?? 0) >= 1) {
    strategicIssues.push('Debilitamiento de la estructura de peones (peones doblados o aislados sin compensación suficiente).');
  }
  if ((mistakeMotifCount.get('seguridad_rey') ?? 0) >= 1) {
    strategicIssues.push('Exposición del rey: se abrieron líneas o quedaron temas tácticos contra tu rey.');
  }
  if (phaseMistakes.final >= 2) {
    strategicIssues.push(`Imprecisiones técnicas en el final (${phaseMistakes.final} jugadas mejorables): activa el rey y apoya los peones pasados.`);
  }
  if (strategicIssues.length === 0) {
    strategicIssues.push('No se detectaron fallos estratégicos graves; la estructura general de tu partida fue sólida.');
  }

  // Fortalezas demostradas.
  const strengths: string[] = [];
  if (accuracyPercent >= 85) {
    strengths.push(`Alta precisión global (${accuracyPercent} %) con pérdidas medias reducidas (${averageCpLoss} cp).`);
  }
  if (counts.excelente + counts.mejor >= Math.max(3, Math.floor(playerEvals.length * 0.35))) {
    strengths.push(`Encontraste la primera opción de Stockfish o jugadas excelentes en ${counts.excelente + counts.mejor} turnos.`);
  }
  const topPosMotifs = [...positiveMotifCount.entries()].sort((a, b) => b[1] - a[1]);
  for (const [m, n] of topPosMotifs.slice(0, 2)) {
    if (n >= 2) {
      strengths.push(`Buen manejo de «${MOTIF_LABELS[m]}» (${n} jugadas acertadas en ese tema).`);
    }
  }
  if (counts.error_grave === 0 && playerEvals.length >= 6) {
    strengths.push('Partida sin errores graves (??): mantuviste el control táctico sin regalar material decisivo.');
  }
  if (strengths.length === 0) {
    strengths.push('Mantuviste la lucha activa y sumaste experiencia analizada jugada a jugada.');
  }

  // Construcción de debilidades combinando esta partida + historial previo (distinguiendo errores aislados de patrones recurrentes).
  const allCandidateMotifs = new Set<MotifId>([
    ...mistakeMotifCount.keys(),
    ...(Object.keys(historicalMistakeMotifs) as MotifId[]),
  ]);

  const weaknessList: WeaknessEntry[] = [];
  for (const motif of allCandidateMotifs) {
    const inGame = mistakeMotifCount.get(motif) ?? 0;
    const hist = historicalMistakeMotifs[motif] ?? 0;
    const total = inGame + hist;
    if (total === 0) continue;
    const isRecurring = inGame >= 2 || total >= 3;
    const patternNote = isRecurring
      ? `Patrón recurrente (${inGame} en esta partida, ${total} acumulado${total === 1 ? '' : 's'} en tu historial).`
      : inGame === 1
        ? 'Error aislado en esta partida (aún no constituye un patrón permanente).'
        : `Registrado en partidas anteriores (${hist} vez/veces); en esta partida no se repitió.`;
    weaknessList.push({
      motif,
      label: MOTIF_LABELS[motif],
      countInGame: inGame,
      countHistorical: hist,
      totalOccurrences: total,
      isRecurringPattern: isRecurring,
      patternNote,
      studyAdvice: STUDY_BY_MOTIF[motif].advice,
    });
  }

  weaknessList.sort(
    (a, b) =>
      Number(b.isRecurringPattern) - Number(a.isRecurringPattern) ||
      b.countInGame * 2 + b.countHistorical - (a.countInGame * 2 + a.countHistorical),
  );

  // Garantizar siempre 3 entradas formativas en el plan de entrenamiento.
  const fallbackMotifs: MotifId[] = ['pieza_indefensa', 'amenaza_ignorada', 'desarrollo', 'finales'];
  for (const fm of fallbackMotifs) {
    if (weaknessList.length >= 3) break;
    if (!weaknessList.some((w) => w.motif === fm)) {
      weaknessList.push({
        motif: fm,
        label: MOTIF_LABELS[fm],
        countInGame: 0,
        countHistorical: 0,
        totalOccurrences: 0,
        isRecurringPattern: false,
        patternNote: 'Tema de refuerzo preventivo (sin errores registrados en esta categoría).',
        studyAdvice: STUDY_BY_MOTIF[fm].advice,
      });
    }
  }

  const topThreeWeaknesses = weaknessList.slice(0, 3);
  const priorityImprovements = topThreeWeaknesses.map(
    (w) => `${w.label}: ${w.studyAdvice} (${w.patternNote})`,
  );

  const conceptsToStudy = topThreeWeaknesses.map((w) => STUDY_BY_MOTIF[w.motif].concept);
  const nextGameObjectives = topThreeWeaknesses.map((w) => STUDY_BY_MOTIF[w.motif].objective);
  const recommendedPuzzles = selectPuzzlesForMotifs(
    topThreeWeaknesses.map((w) => w.motif),
    3,
  );

  // Pequeño desafío para comprobar si aprendió:
  // Si hubo al menos un error o oportunidad perdida en la partida, usamos la posición exacta
  // de su error más importante para que encuentre la mejor jugada que Stockfish recomendó.
  const worstMove = criticalMistakes[0] ?? missedOpportunities[0] ?? null;
  let verificationChallenge: VerificationChallenge;
  if (worstMove && worstMove.bestUci !== worstMove.playedUci) {
    const accepted = Array.from(new Set([worstMove.bestUci, ...worstMove.classification.equallyGoodUcis]));
    verificationChallenge = {
      title: `Desafío de tu propia partida (jugada ${worstMove.moveNumber})`,
      fromOwnGame: true,
      fen: worstMove.fenBefore,
      playerColor: worstMove.mover,
      solutionUci: accepted,
      solutionSanEs: worstMove.bestSanEs,
      playedWrongSanEs: worstMove.playedSanEs,
      prompt: `En la jugada ${worstMove.moveNumber} jugaste ${worstMove.playedSanEs} (${worstMove.classification.meta.label.toLowerCase()}). Encuentra sobre el tablero la mejor jugada que recomendaba el entrenador.`,
      explanation: worstMove.bestAlternativeExplain,
    };
  } else {
    const puz = recommendedPuzzles[0];
    verificationChallenge = {
      title: `Desafío de consolidación: ${puz.title}`,
      fromOwnGame: false,
      fen: puz.fen,
      playerColor: puz.playerColor,
      solutionUci: puz.solutionUci,
      solutionSanEs: puz.solutionUci[0],
      prompt: puz.prompt,
      explanation: puz.explanation,
    };
  }

  return {
    result,
    outcomeForPlayer,
    reasonText,
    playerColor,
    opening,
    totalPlies: evaluations.length,
    totalFullMoves: Math.ceil(evaluations.length / 2),
    playerMoveCount: playerEvals.length,
    counts,
    goodMovesTotal,
    accuracyPercent,
    averageCpLoss,
    methodologyNote,
    bestMoves,
    criticalMistakes,
    missedOpportunities,
    decisiveMoments,
    strategicIssues,
    strengths,
    priorityImprovements,
    trainingPlan: {
      topThreeWeaknesses,
      conceptsToStudy,
      recommendedPuzzles,
      nextGameObjectives,
      verificationChallenge,
    },
  };
}

