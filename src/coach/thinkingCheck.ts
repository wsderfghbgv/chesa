/**
 * Entrenamiento del Proceso de Pensamiento («Pregunta antes de Mover»).
 *
 * A partir del estado real del tablero (`features.ts`) y de las líneas MultiPV de Stockfish,
 * formula una pregunta breve de opción múltiple para acostumbrar al jugador a preguntarse:
 *  1) ¿Qué amenaza mi rival?
 *  2) ¿Qué pieza mía o del rival está indefensa o bajo presión?
 *  3) ¿Cuál de las jugadas candidatas cumple mejor el objetivo de la posición?
 */
import { Chess } from 'chess.js';
import {
  type Color,
  PIECE_NAME,
  other,
  uciToSan,
  localizeSan,
} from '../chess/utils';
import {
  hangingPieces,
  threatsOf,
  findPins,
  development,
  gamePhase,
} from '../chess/features';
import type { AnalysisResult } from '../engine/StockfishEngine';

export interface ThinkingCheckOption {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface ThinkingCheckQuestion {
  ply: number;
  kind: 'opponent_threat' | 'hanging_piece' | 'candidate_move';
  questionText: string;
  contextHint: string;
  options: ThinkingCheckOption[];
}

export function buildThinkingCheckQuestion(params: {
  ply: number;
  fen: string;
  playerColor: Color;
  lastOpponentSanEs?: string;
  posAnalysis?: AnalysisResult | null;
}): ThinkingCheckQuestion | null {
  const { ply, fen, playerColor, lastOpponentSanEs, posAnalysis } = params;
  const chess = new Chess(fen);
  if (chess.isGameOver() || chess.turn() !== playerColor) return null;

  const opp = other(playerColor);
  const oppThreats = threatsOf(chess, opp);
  const myHanging = hangingPieces(chess, playerColor);
  const oppHanging = hangingPieces(chess, opp);
  const pinsAgainstMe = findPins(chess, opp);

  // 1) Si el rival tiene una amenaza inmediata (captura ganadora o mate), preguntar por la amenaza.
  if (oppThreats.length > 0) {
    const topThreat = oppThreats[0];
    const threatSanEs = localizeSan(topThreat.san, 'es');
    const targetDesc =
      topThreat.kind === 'mate'
        ? 'ejecutar jaque mate directo'
        : topThreat.target
          ? `ganar material capturando tu ${PIECE_NAME[topThreat.target.type]} en ${topThreat.target.square} (${threatSanEs})`
          : `ejecutar la captura ${threatSanEs}`;

    return {
      ply,
      kind: 'opponent_threat',
      questionText: lastOpponentSanEs
        ? `Tras la jugada ${lastOpponentSanEs} del rival, ¿cuál es su amenaza táctica más peligrosa si no reaccionas?`
        : 'Antes de mover: ¿qué amenaza concreta tiene tu rival en esta posición?',
      contextHint: 'Disciplina de Gran Maestro: verifica siempre los jaques y capturas del rival antes de calcular tu propio plan.',
      options: [
        {
          id: 'opt-threat-real',
          label: `Amenaza ${targetDesc}.`,
          isCorrect: true,
          feedback: `¡Exacto! El rival amenaza ${targetDesc}. Neutralizar o contrarrestar esta amenaza es tu prioridad nº 1.`,
        },
        {
          id: 'opt-threat-none',
          label: 'No existe ninguna amenaza táctica directa; puedo desarrollar cualquier pieza sin urgencia.',
          isCorrect: false,
          feedback: `Cuidado: ignorar la amenaza permitiría al rival ${targetDesc}.`,
        },
        {
          id: 'opt-threat-passive',
          label: 'Solo busca cambiar peones laterales sin atacar ninguna pieza.',
          isCorrect: false,
          feedback: `Fíjate bien en las piezas activas del rival: su verdadera amenaza es ${targetDesc}.`,
        },
      ],
    };
  }

  // 2) Si el rival dejó una pieza colgada o existe una clavada táctica a nuestro favor/en contra.
  if (oppHanging.length > 0) {
    const target = oppHanging[0];
    const pieceName = PIECE_NAME[target.type];
    return {
      ply,
      kind: 'hanging_piece',
      questionText: 'Observa la coordinación del rival: ¿qué debilidad táctica acaba de aparecer en su campo?',
      contextHint: 'Las piezas sin defensores («piezas sueltas») son la semilla de casi todas las combinaciones.',
      options: [
        {
          id: 'opt-hang-opp',
          label: `El/la ${pieceName} del rival en ${target.square} está vulnerable o insuficientemente defendido/a.`,
          isCorrect: true,
          feedback: `¡Bien visto! El/la ${pieceName} en ${target.square} puede ser capturado/a con ganancia material.`,
        },
        {
          id: 'opt-hang-safe',
          label: 'Todas las piezas del rival están perfectamente defendidas; debo jugar de forma pasiva.',
          isCorrect: false,
          feedback: `Mira la casilla ${target.square}: el/la ${pieceName} rival no tiene defensa suficiente.`,
        },
        {
          id: 'opt-hang-king',
          label: 'Mi única opción legal es retroceder con el rey.',
          isCorrect: false,
          feedback: `Tienes iniciativa táctica sobre la casilla ${target.square} (${pieceName}).`,
        },
      ],
    };
  }

  if (myHanging.length > 0 || pinsAgainstMe.length > 0) {
    const detail =
      myHanging.length > 0
        ? `tu ${PIECE_NAME[myHanging[0].type]} en ${myHanging[0].square} está atacado/a`
        : `tu ${PIECE_NAME[pinsAgainstMe[0].pinned.type]} en ${pinsAgainstMe[0].pinned.square} está clavado/a`;
    return {
      ply,
      kind: 'hanging_piece',
      questionText: 'Antes de elegir tu jugada, ¿qué detalle defensivo de tus propias piezas debes tener en cuenta?',
      contextHint: 'Antes de soltar la pieza, comprueba que ninguna de tus unidades quede indefensa o clavada.',
      options: [
        {
          id: 'opt-own-vuln',
          label: `Que ${detail} y requiere atención.`,
          isCorrect: true,
          feedback: `¡Muy atento! Detectar a tiempo que ${detail} evita errores graves.`,
        },
        {
          id: 'opt-own-none',
          label: 'Ninguna de mis piezas tiene presión ni clavadas sobre el tablero.',
          isCorrect: false,
          feedback: `Revisa el tablero con cuidado: ${detail}.`,
        },
        {
          id: 'opt-own-random',
          label: 'Puedo avanzar peones del enroque sin revisar el centro.',
          isCorrect: false,
          feedback: `Debilitaría tu rey e ignoraría que ${detail}.`,
        },
      ],
    };
  }

  // 3) Si tenemos líneas de Stockfish disponibles, preguntar por la mejor jugada candidata y su propósito.
  const bestUci = posAnalysis?.lines[0]?.pv[0];
  if (bestUci) {
    const bestSan = uciToSan(fen, bestUci);
    const bestSanEs = localizeSan(bestSan, 'es');
    const legalMoves = chess.moves({ verbose: true });
    const distractors = legalMoves
      .filter((m) => m.from + m.to + (m.promotion ?? '') !== bestUci)
      .slice(0, 8);
    // Elegir 2 jugadas legales que no estén en el top de Stockfish (preferiblemente de borde o pasivas)
    const topSet = new Set((posAnalysis?.lines ?? []).map((l) => l.pv[0]));
    const nonTop = distractors.filter((m) => !topSet.has(m.from + m.to + (m.promotion ?? '')));
    const pick1 = nonTop[0] ?? distractors[0];
    const pick2 = nonTop[nonTop.length - 1] ?? distractors[1];

    if (pick1 && pick2 && pick1.san !== pick2.san) {
      const phase = gamePhase(chess);
      const dev = development(chess, playerColor);
      const goalHint =
        phase === 'apertura' && dev.undevelopedMinors > 0
          ? 'desarrollar piezas hacia el centro y asegurar el rey'
          : phase === 'final'
            ? 'activar el rey y presionar peones débiles o pasados'
            : 'mejorar la pieza peor colocada y controlar casillas centrales';

      const san1Es = localizeSan(pick1.san, 'es');
      const san2Es = localizeSan(pick2.san, 'es');

      return {
        ply,
        kind: 'candidate_move',
        questionText: `Selección de jugadas candidatas (${phase}): ¿cuál de estas 3 opciones recomienda el análisis para ${goalHint}?`,
        contextHint: `En el ${phase}, busca jugadas activas que mejoren tu coordinación.`,
        options: [
          {
            id: 'opt-cand-best',
            label: `${bestSanEs} — jugada candidata principal de Stockfish`,
            isCorrect: true,
            feedback: `¡Excelente criterio! ${bestSanEs} es la primera opción del motor en esta posición.`,
          },
          {
            id: 'opt-cand-d1',
            label: `${san1Es} — alternativa secundaria`,
            isCorrect: false,
            feedback: `Aunque ${san1Es} es legal, ${bestSanEs} aprovecha mejor la posición para ${goalHint}.`,
          },
          {
            id: 'opt-cand-d2',
            label: `${san2Es} — jugada menos activa`,
            isCorrect: false,
            feedback: `Stockfish prefiere ${bestSanEs} porque mantiene mayor iniciativa y coordinación.`,
          },
        ],
      };
    }
  }

  return null;
}
