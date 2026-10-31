/**
 * Banco de ejercicios tácticos y estratégicos verificados con Stockfish.
 *
 * Cada ejercicio está etiquetado con su motivo principal (`MotifId`) para que el sistema
 * de aprendizaje personalizado recomiende ejercicios directamente relacionados con las
 * debilidades recurrentes del jugador, además de alimentar el Modo Desafío y el Modo
 * «Juega la mejor jugada».
 */
import type { Color } from '../chess/utils';
import type { MotifId } from './explain';

export interface CoachingPuzzle {
  id: string;
  title: string;
  motif: MotifId;
  difficulty: 'principiante' | 'intermedio' | 'avanzado';
  fen: string;
  playerColor: Color;
  /** Jugadas aceptadas como solución en formato UCI (la primera es la principal de Stockfish). */
  solutionUci: string[];
  prompt: string;
  hint: string;
  explanation: string;
  conceptToStudy: string;
}

export const PUZZLES: CoachingPuzzle[] = [
  {
    id: 'puz-colgada-1',
    title: 'Castiga la pieza sin defensa',
    motif: 'pieza_indefensa',
    difficulty: 'principiante',
    fen: 'r1bqkbnr/pppp1ppp/8/8/3nP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    playerColor: 'w',
    solutionUci: ['f3d4'],
    prompt: 'Las negras acaban de saltar con ...Cd4 sin ningún peón que lo sostenga. ¿Cómo castigas esa pieza indefensa?',
    hint: 'Mira qué pieza negra en el centro no tiene ningún peón ni pieza que la defienda.',
    explanation: 'Cxd4! gana un caballo limpio porque el caballo negro en d4 no tenía ningún defensor.',
    conceptToStudy: 'Conteo de atacantes y defensores antes de saltar con una pieza al campo rival.',
  },
  {
    id: 'puz-colgada-2',
    title: 'Dama activa contra pieza suelta',
    motif: 'pieza_indefensa',
    difficulty: 'intermedio',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 5',
    playerColor: 'w',
    solutionUci: ['f3e5'],
    prompt: 'Detecta la pieza o peón tácticamente vulnerable en el centro mediante un golpe temporal.',
    hint: 'Observa qué ocurre si capturas en e5 y respondes a ...Cxe5 con d4.',
    explanation: 'Cxe5! utiliza el tema del centro tenedor: si 5...Cxe5 sigue 6.d4 atacando a la vez el alfil de c5 y el caballo de e5, recuperando la pieza con ventaja central.',
    conceptToStudy: 'Combinaciones de pseudosacrificio basadas en horquillas de peón (d4) sobre piezas sueltas.',
  },
  {
    id: 'puz-amenaza-1',
    title: 'Defensa ante amenaza de mate en f2',
    motif: 'amenaza_ignorada',
    difficulty: 'principiante',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    playerColor: 'b',
    solutionUci: ['d8f6', 'g8f6', 'd8e7'],
    prompt: 'Las blancas acaban de jugar Df3 amenazando Dxf7# (mate del pastor). Neutraliza la amenaza desarrollando con criterio.',
    hint: 'Revisa la casilla f7: está atacada por la dama en f3 y el alfil en c4.',
    explanation: 'Cf6 (o Df6/De7) intercepta o defiende el punto f7 a la vez que desarrolla una pieza y prepara el enroque.',
    conceptToStudy: 'Pregunta obligatoria tras cada jugada rival: «¿Qué amenaza exactamente este movimiento?».',
  },
  {
    id: 'puz-doble-1',
    title: 'Horquilla real en c7',
    motif: 'ataque_doble',
    difficulty: 'principiante',
    fen: 'r1bqkb1r/ppp2ppp/2np1n2/1N2p3/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 5',
    playerColor: 'w',
    solutionUci: ['b5c7'],
    prompt: 'Tu caballo en b5 mira hacia una casilla débil del campo negro. ¡Ejecuta el ataque doble!',
    hint: 'Busca una casilla desde la que el caballo dé jaque al rey en e8 y ataque simultáneamente la torre de a8.',
    explanation: 'Cxc7+! da jaque al rey negro y ataca la torre de a8 al mismo tiempo; tras ...Rd7, Cxa8 gana calidad y un peón.',
    conceptToStudy: 'Horquillas de caballo sobre las casillas c7 y f7 cuando no están defendidas.',
  },
  {
    id: 'puz-doble-2',
    title: 'Ataque doble de dama',
    motif: 'ataque_doble',
    difficulty: 'intermedio',
    fen: 'r1b1kbnr/pppp1ppp/2n5/4p3/2B1n3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
    playerColor: 'w',
    solutionUci: ['c3e4', 'c4f7'],
    prompt: 'Las negras acaban de capturar en e4 dejando piezas descoordinadas. ¿Cuál es la continuación más fuerte?',
    hint: 'Compara recuperar directamente la pieza central o golpear el punto débil f7.',
    explanation: 'Cxe4 recupera la pieza centralizando el caballo y dominando d6 y f6; Axf7+ seguido de Cxe4 también explota la debilidad táctica.',
    conceptToStudy: 'Cálculo de intercambios tácticos en el centro antes de que el rival consolide.',
  },
  {
    id: 'puz-clavada-1',
    title: 'Explota la clavada absoluta',
    motif: 'clavada',
    difficulty: 'principiante',
    fen: '4k3/8/8/4r3/8/8/8/R3K2R w KQ - 0 1',
    playerColor: 'w',
    solutionUci: ['e1d2', 'e1f2', 'a1a8'],
    prompt: 'Estás en jaque por la torre en e5. Elige la respuesta que mantiene todas tus piezas seguras y activas.',
    hint: 'Sal del jaque llevando el rey hacia el centro sin bloquear ni exponer tus torres.',
    explanation: 'Rd2 (o Rf2) sale del jaque centralizando el rey y conectando las dos torres para dominar el tablero.',
    conceptToStudy: 'Respuesta a jaques y prevención de clavadas en columnas abiertas.',
  },
  {
    id: 'puz-clavada-2',
    title: 'Clavada ganadora en la columna e',
    motif: 'clavada',
    difficulty: 'intermedio',
    fen: '4k3/ppp2ppp/8/4n3/8/8/PPP2PPP/4R1K1 w - - 0 1',
    playerColor: 'w',
    solutionUci: ['e1e5', 'f2f4'],
    prompt: 'El caballo negro de e5 está en la misma columna que su rey en e8. ¿Cómo ganas material?',
    hint: 'La torre en e1 mira al rey de e8 a través del caballo de e5.',
    explanation: 'Txe5+ captura el caballo indefenso con jaque (y f4 también explota la clavada absoluta en la columna e).',
    conceptToStudy: 'Alineación de piezas enemigas con el rey en columnas y diagonales abiertas.',
  },
  {
    id: 'puz-descubierta-1',
    title: 'Jaque a la descubierta letal',
    motif: 'descubierta',
    difficulty: 'intermedio',
    fen: '4k3/8/8/3q4/4N3/8/8/4R1K1 w - - 0 1',
    playerColor: 'w',
    solutionUci: ['e4f6'],
    prompt: 'Tu torre en e1 está detrás de tu caballo en e4, en la columna del rey negro. ¡Encuentra el golpe ganador!',
    hint: 'Busca un salto de caballo que dé jaque y a la vez ataque la dama negra en d5.',
    explanation: 'Cf6+! es un jaque doble y ataque a la descubierta: el rey negro está obligado a moverse y en la siguiente jugada Cxd5 gana la dama.',
    conceptToStudy: 'Baterías torre+caballo o alfil+caballo para ataques a la descubierta.',
  },
  {
    id: 'puz-rey-1',
    title: 'Mate del pasillo (octava fila)',
    motif: 'seguridad_rey',
    difficulty: 'principiante',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    playerColor: 'w',
    solutionUci: ['d1d8'],
    prompt: 'El rey negro no tiene casillas de escape detrás de sus peones. Remata la partida.',
    hint: 'Observa la octava fila totalmente despejada.',
    explanation: 'Td8# es jaque mate en el acto: los propios peones de f7, g7 y h7 impiden que el rey negro escape de la octava fila.',
    conceptToStudy: 'Debilidad de la primera/octava fila y creación de una casilla de respiro («luft»).',
  },
  {
    id: 'puz-sacrificio-1',
    title: 'Remate táctico sobre f7',
    motif: 'sacrificio',
    difficulty: 'principiante',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    playerColor: 'w',
    solutionUci: ['h5f7'],
    prompt: 'La dama en h5 y el alfil en c4 convergen sobre un único punto junto al rey negro.',
    hint: 'Cuenta cuántos atacantes y defensores tiene la casilla f7.',
    explanation: 'Dxf7# es jaque mate: la dama está defendida por el alfil de c4 y el rey negro no puede capturarla ni escapar.',
    conceptToStudy: 'Convergencia de dos piezas sobre el punto más débil antes del enroque (f2/f7).',
  },
  {
    id: 'puz-final-1',
    title: 'Coronación y oposición en el final',
    motif: 'finales',
    difficulty: 'intermedio',
    fen: '8/4P3/4K3/8/8/8/8/6k1 w - - 0 1',
    playerColor: 'w',
    solutionUci: ['e7e8q'],
    prompt: 'Tu peón pasado ha llegado a la séptima fila apoyado por el rey. Conviértelo en victoria.',
    hint: 'La casilla e8 está controlada por tu rey en e6.',
    explanation: 'e8=D corona con ventaja decisiva de dama contra rey solitario.',
    conceptToStudy: 'Apoyo del rey al peón pasado hasta la casilla de coronación.',
  },
  {
    id: 'puz-centro-1',
    title: 'Ruptura y dominio central',
    motif: 'control_centro',
    difficulty: 'intermedio',
    fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 1 6',
    playerColor: 'w',
    solutionUci: ['b2b4', 'e1g1', 'd3d4'],
    prompt: 'Estás en una Italiana clásica con c3 preparado. Elige una jugada constructiva que gane espacio o asegure el rey.',
    hint: 'Puedes enrocar para poner al rey a salvo, expandirte en el flanco de dama con b4 o romper en el centro con d4.',
    explanation: 'O-O, b4 o d4 siguen los principios clásicos: asegurar el rey y ganar espacio contra el alfil de c5.',
    conceptToStudy: 'Preparación de rupturas de peones (c3–d4 o b4) y seguridad del rey en la apertura.',
  },
];

/** Devuelve los ejercicios más adecuados para una lista de motivos prioritarios. */
export function selectPuzzlesForMotifs(motifs: MotifId[], limit = 3): CoachingPuzzle[] {
  const chosen: CoachingPuzzle[] = [];
  for (const m of motifs) {
    for (const p of PUZZLES) {
      if (p.motif === m && !chosen.includes(p)) {
        chosen.push(p);
        if (chosen.length >= limit) return chosen;
      }
    }
  }
  for (const p of PUZZLES) {
    if (!chosen.includes(p)) {
      chosen.push(p);
      if (chosen.length >= limit) return chosen;
    }
  }
  return chosen;
}
