/**
 * Entrenador de Repertorio de Aperturas con Repetición Espaciada (SM-2 / Leitner).
 *
 * Incluye líneas fundamentales con Blancas y con Negras, explicando la idea estratégica
 * de cada jugada teórica, las celadas típicas y programando repasos espaciados según
 * los aciertos o fallos del jugador.
 */
import { type Color } from '../chess/utils';

export interface OpeningStep {
  ply: number;
  uci: string;
  sanEs: string;
  mover: Color;
  comment: string;
}

export interface OpeningRepertoireLine {
  id: string;
  eco: string;
  name: string;
  subtitle: string;
  playerColor: Color;
  difficulty: 'basico' | 'intermedio' | 'avanzado';
  strategicGoal: string;
  typicalTrapWarning: string;
  steps: OpeningStep[];
}

export interface OpeningSrState {
  lineId: string;
  box: number; // 0 = nuevo / fallado hoy, 1..5 = nivel de dominio Leitner
  intervalDays: number;
  nextReviewIso: string;
  totalSessions: number;
  cleanRuns: number;
  mistakesTotal: number;
  lastPracticedIso: string;
}

export const OPENING_REPERTOIRE: OpeningRepertoireLine[] = [
  {
    id: 'rep-italiana-giuoco-piano',
    eco: 'C53',
    name: 'Apertura Italiana · Giuoco Piano (c3 y d4)',
    subtitle: 'Control clásico del centro y presión directa sobre f7',
    playerColor: 'w',
    difficulty: 'basico',
    strategicGoal:
      'Desarrollar rápido las piezas menores hacia el centro, apuntar al punto débil f7 con el alfil en c4 y preparar la ruptura central d4 con el peón de apoyo en c3.',
    typicalTrapWarning:
      'No lances Cg5 prematuramente si las negras ya han desarrollado su caballo a f6 y tienen fácil defensa con d5 (evita quedar con el caballo mal colocado).',
    steps: [
      {
        ply: 1,
        uci: 'e2e4',
        sanEs: 'e4',
        mover: 'w',
        comment: 'Ocupa el centro y abre las diagonales para el alfil de f1 y la dama.',
      },
      {
        ply: 2,
        uci: 'e7e5',
        sanEs: 'e5',
        mover: 'b',
        comment: 'Las negras responden de forma simétrica fijando el centro.',
      },
      {
        ply: 3,
        uci: 'g1f3',
        sanEs: 'Cf3',
        mover: 'w',
        comment: 'Desarrolla el caballo hacia el centro atacando inmediatamente el peón de e5.',
      },
      {
        ply: 4,
        uci: 'b8c6',
        sanEs: 'Cc6',
        mover: 'b',
        comment: 'Defensa natural desarrollando una pieza y protegiendo e5.',
      },
      {
        ply: 5,
        uci: 'f1c4',
        sanEs: 'Ac4',
        mover: 'w',
        comment: 'La jugada característica de la Italiana: apunta a la casilla más vulnerable de las negras (f7) y despeja el enroque corto.',
      },
      {
        ply: 6,
        uci: 'f8c5',
        sanEs: 'Ac5',
        mover: 'b',
        comment: 'Entrando en el Giuoco Piano: las negras también activan su alfil en la diagonal activa.',
      },
      {
        ply: 7,
        uci: 'c2c3',
        sanEs: 'c3',
        mover: 'w',
        comment: 'Prepara la ruptura central d2-d4 para construir un centro ideal de peones en d4 y e4.',
      },
      {
        ply: 8,
        uci: 'g8f6',
        sanEs: 'Cf6',
        mover: 'b',
        comment: 'Contraataque clásico sobre tu peón central de e4.',
      },
      {
        ply: 9,
        uci: 'd2d4',
        sanEs: 'd4',
        mover: 'w',
        comment: '¡Ruptura central temática! Cuestionas el alfil de c5 y abres líneas en el centro.',
      },
      {
        ply: 10,
        uci: 'e5d4',
        sanEs: 'exd4',
        mover: 'b',
        comment: 'Cambio forzado para no ceder todo el centro sin compensación.',
      },
      {
        ply: 11,
        uci: 'c3d4',
        sanEs: 'cxd4',
        mover: 'w',
        comment: 'Recuperas con el peón de c3 logrando el centro clásico perfecto e4+d4 con ganancia de tiempo sobre el alfil negro.',
      },
    ],
  },
  {
    id: 'rep-espanola-morphy',
    eco: 'C84',
    name: 'Apertura Española (Ruy López) · Línea Principal',
    subtitle: 'Presión estratégica duradera sobre el defensor de e5',
    playerColor: 'w',
    difficulty: 'intermedio',
    strategicGoal:
      'Presionar indirectamente el peón central negro de e5 mediante el ataque a su defensor en c6, enrocar rápido y usar la columna e con la torre.',
    typicalTrapWarning:
      'Tras 3...a6 4.Aa4, capturar 4.Axc6 y luego 5.Cxe5 no gana peón por 5...Dd4! atacando el caballo y el peón de e4 a la vez.',
    steps: [
      {
        ply: 1,
        uci: 'e2e4',
        sanEs: 'e4',
        mover: 'w',
        comment: 'Controla d5 y f5 y libera tus piezas del flanco de rey.',
      },
      {
        ply: 2,
        uci: 'e7e5',
        sanEs: 'e5',
        mover: 'b',
        comment: 'Respuesta clásica por el centro.',
      },
      {
        ply: 3,
        uci: 'g1f3',
        sanEs: 'Cf3',
        mover: 'w',
        comment: 'Ataca e5 y prepara el enroque corto.',
      },
      {
        ply: 4,
        uci: 'b8c6',
        sanEs: 'Cc6',
        mover: 'b',
        comment: 'Defiende el peón de e5.',
      },
      {
        ply: 5,
        uci: 'f1b5',
        sanEs: 'Ab5',
        mover: 'w',
        comment: 'Apertura Española (Ruy López): presionas al defensor del peón de e5 y preparas el enroque rápido.',
      },
      {
        ply: 6,
        uci: 'a7a6',
        sanEs: 'a6',
        mover: 'b',
        comment: 'Defensa Morphy: obliga al alfil blanco a definir su intención.',
      },
      {
        ply: 7,
        uci: 'b5a4',
        sanEs: 'Aa4',
        mover: 'w',
        comment: 'Mantienes la tensión sobre c6 sin ceder la pareja de alfiles prematuramente.',
      },
      {
        ply: 8,
        uci: 'g8f6',
        sanEs: 'Cf6',
        mover: 'b',
        comment: 'Las negras desarrollan su caballo atacando e4.',
      },
      {
        ply: 9,
        uci: 'e1g1',
        sanEs: 'O-O',
        mover: 'w',
        comment: 'Pones al rey a salvo; si las negras capturan en e4, recuperarás el peón con Te1 y d4 con gran ventaja de desarrollo.',
      },
    ],
  },
  {
    id: 'rep-londres-solido',
    eco: 'D02',
    name: 'Sistema Londres · Estructura Piramidal',
    subtitle: 'Esquema universal y sólido con d4 y Af4',
    playerColor: 'w',
    difficulty: 'basico',
    strategicGoal:
      'Desarrollar el alfil de casillas negras a f4 ANTES de jugar e3 para que no quede encerrado dentro de la cadena de peones d4-e3-c3.',
    typicalTrapWarning:
      'No juegues e3 en la jugada 2 antes de sacar el alfil a f4, o te quedarás con un «alfil malo» pasivo durante toda la partida.',
    steps: [
      {
        ply: 1,
        uci: 'd2d4',
        sanEs: 'd4',
        mover: 'w',
        comment: 'Ocupa el centro con un peón protegido por la dama.',
      },
      {
        ply: 2,
        uci: 'd7d5',
        sanEs: 'd5',
        mover: 'b',
        comment: 'Las negras igualan el espacio en el centro.',
      },
      {
        ply: 3,
        uci: 'c1f4',
        sanEs: 'Af4',
        mover: 'w',
        comment: 'Jugada clave del Sistema Londres: activas el alfil fuera de la cadena de peones controlando la gran diagonal h2-b8.',
      },
      {
        ply: 4,
        uci: 'g8f6',
        sanEs: 'Cf6',
        mover: 'b',
        comment: 'Desarrollo natural controlando e4.',
      },
      {
        ply: 5,
        uci: 'e2e3',
        sanEs: 'e3',
        mover: 'w',
        comment: 'Ahora sí cierras la cadena protegiendo d4 y abriendo paso al alfil de f1.',
      },
      {
        ply: 6,
        uci: 'c7c5',
        sanEs: 'c5',
        mover: 'b',
        comment: 'Las negras cuestionan tu centro inmediatamente.',
      },
      {
        ply: 7,
        uci: 'c2c3',
        sanEs: 'c3',
        mover: 'w',
        comment: 'Completa la pirámide de peones (c3-d4-e3): si las negras cambian en d4, retomarás con exd4 abriendo la columna e.',
      },
    ],
  },
  {
    id: 'rep-gambito-dama',
    eco: 'D35',
    name: 'Gambito de Dama Declinado · Ataque Central',
    subtitle: 'Lucha clásica por las casillas centrales con d4 y c4',
    playerColor: 'w',
    difficulty: 'intermedio',
    strategicGoal:
      'Presionar el punto central d5 mediante c4 y Cc3, desarrollando ambos alfiles activamente antes de cerrar la estructura.',
    typicalTrapWarning:
      'Si las negras capturan en c4 (Gambito Aceptado), no intentes defender el peón a toda costa ni te precipites; desarrolla con e3/e4 y Axc4.',
    steps: [
      {
        ply: 1,
        uci: 'd2d4',
        sanEs: 'd4',
        mover: 'w',
        comment: 'Control firme del centro.',
      },
      {
        ply: 2,
        uci: 'd7d5',
        sanEs: 'd5',
        mover: 'b',
        comment: 'Oposición central directa.',
      },
      {
        ply: 3,
        uci: 'c2c4',
        sanEs: 'c4',
        mover: 'w',
        comment: 'El Gambito de Dama: ofreces temporalmente un peón lateral para desviar al peón central negro de d5.',
      },
      {
        ply: 4,
        uci: 'e7e6',
        sanEs: 'e6',
        mover: 'b',
        comment: 'Gambito de Dama Declinado: las negras sostienen d5 con un peón.',
      },
      {
        ply: 5,
        uci: 'b1c3',
        sanEs: 'Cc3',
        mover: 'w',
        comment: 'Aumenta la presión sobre d5 y controla la casilla e4.',
      },
      {
        ply: 6,
        uci: 'g8f6',
        sanEs: 'Cf6',
        mover: 'b',
        comment: 'Refuerza la defensa de d5.',
      },
      {
        ply: 7,
        uci: 'c4d5',
        sanEs: 'cxd5',
        mover: 'w',
        comment: 'Variante del Cambio: defines la estructura central de peones (estructura Carlsbad) y liberas la diagonal para tu alfil de c1.',
      },
      {
        ply: 8,
        uci: 'e6d5',
        sanEs: 'exd5',
        mover: 'b',
        comment: 'Las negras retoman liberando su propio alfil de c8.',
      },
      {
        ply: 9,
        uci: 'c1g5',
        sanEs: 'Ag5',
        mover: 'w',
        comment: 'Clavas el caballo defensor de d5 antes de jugar e3, logrando una posición armónica sin piezas pasivas.',
      },
    ],
  },
  {
    id: 'rep-siciliana-najdorf',
    eco: 'B90',
    name: 'Defensa Siciliana · Variante Najdorf (con Negras)',
    subtitle: 'Contraataque asimétrico y dinámico contra 1.e4',
    playerColor: 'b',
    difficulty: 'avanzado',
    strategicGoal:
      'Cambiar tu peón lateral de c5 por el peón central blanco de d4 para obtener mayoría central (peones d y e contra peón e) y contrajuego en la columna semiabierta c.',
    typicalTrapWarning:
      'Vigila siempre el sacrificio típico blanco Cd5 o Axf7+ si retrasas el desarrollo del flanco de rey; enrócate antes de lanzar el ataque en el flanco de dama.',
    steps: [
      {
        ply: 1,
        uci: 'e2e4',
        sanEs: 'e4',
        mover: 'w',
        comment: 'Las blancas abren con el peón de rey.',
      },
      {
        ply: 2,
        uci: 'c7c5',
        sanEs: 'c5',
        mover: 'b',
        comment: 'Defensa Siciliana: luchas por la casilla central d4 desde el flanco creando desequilibrio desde la jugada 1.',
      },
      {
        ply: 3,
        uci: 'g1f3',
        sanEs: 'Cf3',
        mover: 'w',
        comment: 'Las blancas preparan la ruptura central d4.',
      },
      {
        ply: 4,
        uci: 'd7d6',
        sanEs: 'd6',
        mover: 'b',
        comment: 'Controlas la casilla e5 e impides el avance e4-e5.',
      },
      {
        ply: 5,
        uci: 'd2d4',
        sanEs: 'd4',
        mover: 'w',
        comment: 'Siciliana Abierta: las blancas abren el centro.',
      },
      {
        ply: 6,
        uci: 'c5d4',
        sanEs: 'cxd4',
        mover: 'b',
        comment: '¡Cambio estratégico clave! Cambias un peón de alfil (c) por un peón central (d) y abres la columna c para tus torres.',
      },
      {
        ply: 7,
        uci: 'f3d4',
        sanEs: 'Cxd4',
        mover: 'w',
        comment: 'Las blancas centralizan su caballo.',
      },
      {
        ply: 8,
        uci: 'g8f6',
        sanEs: 'Cf6',
        mover: 'b',
        comment: 'Desarrollas con ganancia de tiempo obligando a las blancas a defender e4.',
      },
      {
        ply: 9,
        uci: 'b1c3',
        sanEs: 'Cc3',
        mover: 'w',
        comment: 'Defensa natural de e4.',
      },
      {
        ply: 10,
        uci: 'a7a6',
        sanEs: 'a6',
        mover: 'b',
        comment: 'Variante Najdorf: quitas la casilla b5 a los caballos y alfiles blancos y preparas la expansión ...b5 o ...e5.',
      },
    ],
  },
  {
    id: 'rep-francesa-avance',
    eco: 'C02',
    name: 'Defensa Francesa · Contraataque a la Cadena (con Negras)',
    subtitle: 'Ruptura temática ...c5 contra el centro blanco en d4-e5',
    playerColor: 'b',
    difficulty: 'intermedio',
    strategicGoal:
      'Atacar implacablemente la base de la cadena de peones blanca (d4) mediante ...c5, ...Cc6 y ...Db6.',
    typicalTrapWarning:
      'En la Variante del Avance, la casilla d4 es tu objetivo principal, pero ten cuidado con la trampa de la dama en b6 tras Ad2 (no captures en b2 si pierdes la defensa de d5 o quedas encerrado).',
    steps: [
      {
        ply: 1,
        uci: 'e2e4',
        sanEs: 'e4',
        mover: 'w',
        comment: 'Apertura de peón de rey.',
      },
      {
        ply: 2,
        uci: 'e7e6',
        sanEs: 'e6',
        mover: 'b',
        comment: 'Defensa Francesa: preparas el golpe central ...d5 respaldado por peón.',
      },
      {
        ply: 3,
        uci: 'd2d4',
        sanEs: 'd4',
        mover: 'w',
        comment: 'Las blancas ocupan el centro con ambos peones.',
      },
      {
        ply: 4,
        uci: 'd7d5',
        sanEs: 'd5',
        mover: 'b',
        comment: 'Cuestionas inmediatamente el peón de e4.',
      },
      {
        ply: 5,
        uci: 'e4e5',
        sanEs: 'e5',
        mover: 'w',
        comment: 'Variante del Avance: las blancas ganan espacio pero fijan su centro.',
      },
      {
        ply: 6,
        uci: 'c7c5',
        sanEs: 'c5',
        mover: 'b',
        comment: '¡Golpe temático obligatorio! Atacas la base de la cadena blanca (d4) antes de que las blancas se consoliden.',
      },
      {
        ply: 7,
        uci: 'c2c3',
        sanEs: 'c3',
        mover: 'w',
        comment: 'Las blancas sostienen d4 con otro peón.',
      },
      {
        ply: 8,
        uci: 'b8c6',
        sanEs: 'Cc6',
        mover: 'b',
        comment: 'Añades una segunda pieza atacante sobre la base en d4.',
      },
      {
        ply: 9,
        uci: 'g1f3',
        sanEs: 'Cf3',
        mover: 'w',
        comment: 'Las blancas defienden d4.',
      },
      {
        ply: 10,
        uci: 'd8b6',
        sanEs: 'Db6',
        mover: 'b',
        comment: 'Triple presión sobre d4 y rayos X sobre b2, impidiendo que el alfil blanco de c1 salga cómodamente.',
      },
    ],
  },
];

const SR_STORAGE_KEY = 'ccai_openings_sr_v1';

export function loadOpeningSrMap(): Record<string, OpeningSrState> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(SR_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, OpeningSrState>;
  } catch {
    return {};
  }
}

export function saveOpeningSrMap(map: Record<string, OpeningSrState>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SR_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignorado
  }
}

/**
 * Actualiza el estado de repetición espaciada (algoritmo Leitner / SM-2 simplificado)
 * al completar o fallar una sesión de práctica de una línea de apertura.
 */
export function recordOpeningPracticeResult(
  lineId: string,
  mistakesInRun: number,
  now = new Date(),
): OpeningSrState {
  const map = loadOpeningSrMap();
  const prev = map[lineId] ?? {
    lineId,
    box: 0,
    intervalDays: 0,
    nextReviewIso: now.toISOString(),
    totalSessions: 0,
    cleanRuns: 0,
    mistakesTotal: 0,
    lastPracticedIso: now.toISOString(),
  };

  const isClean = mistakesInRun === 0;
  const nextBox = isClean ? Math.min(5, prev.box + 1) : Math.max(1, prev.box - 1);
  const intervals = [0, 1, 3, 7, 14, 30];
  const intervalDays = isClean ? intervals[nextBox] ?? 1 : 0;
  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  const updated: OpeningSrState = {
    lineId,
    box: nextBox,
    intervalDays,
    nextReviewIso: nextDate.toISOString(),
    totalSessions: prev.totalSessions + 1,
    cleanRuns: prev.cleanRuns + (isClean ? 1 : 0),
    mistakesTotal: prev.mistakesTotal + mistakesInRun,
    lastPracticedIso: now.toISOString(),
  };

  map[lineId] = updated;
  saveOpeningSrMap(map);
  return updated;
}

/** Devuelve qué líneas requieren repaso hoy según la repetición espaciada. */
export function isOpeningDueForReview(state: OpeningSrState | undefined, now = new Date()): boolean {
  if (!state) return true;
  if (state.box === 0) return true;
  return new Date(state.nextReviewIso).getTime() <= now.getTime();
}

