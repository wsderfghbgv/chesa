/**
 * Laboratorio de Finales Técnicos contra Stockfish.
 *
 * Permite practicar finales elementales y teóricos completos jugando contra Stockfish
 * hasta lograr el objetivo técnico (dar jaque mate, coronar o sostener las tablas teóricas).
 */
import { type Color } from '../chess/utils';

export interface EndgameDrill {
  id: string;
  title: string;
  category: 'Mates elementales' | 'Finales de peones' | 'Finales de torres';
  difficulty: 'basico' | 'intermedio' | 'avanzado';
  fen: string;
  playerColor: Color;
  targetOutcome: 'win' | 'draw';
  objectiveText: string;
  techniqueSteps: string[];
  commonMistakeToAvoid: string;
}

export const ENDGAME_DRILLS: EndgameDrill[] = [
  {
    id: 'end-mate-dama',
    title: '1. Mate Elemental: Rey y Dama contra Rey (R+D vs R)',
    category: 'Mates elementales',
    difficulty: 'basico',
    fen: '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1',
    playerColor: 'w',
    targetOutcome: 'win',
    objectiveText: 'Acorrala al rey negro en el borde del tablero y dale jaque mate sin ahogarlo.',
    techniqueSteps: [
      'Coloca tu Dama a «salto de caballo» del rey enemigo para encerrarlo en una caja cada vez más pequeña.',
      'Cuando el rey negro quede confinado en la última fila o columna, detén los jaques con la dama y acerca tu propio Rey hasta colocarlo frente al rey rival.',
      'Da el mate definitivo en el borde apoyando a la dama con tu rey.',
    ],
    commonMistakeToAvoid:
      '¡Cuidado con el Rey Ahogado! Cuando el rey enemigo ya está en la esquina (por ejemplo h8 o a8), deja siempre al menos dos casillas o da jaque directo.',
  },
  {
    id: 'end-mate-torre',
    title: '2. Mate Elemental: Rey y Torre contra Rey (R+T vs R)',
    category: 'Mates elementales',
    difficulty: 'basico',
    fen: '4k3/8/8/8/8/8/R7/4K3 w - - 0 1',
    playerColor: 'w',
    targetOutcome: 'win',
    objectiveText: 'Usa el método de «la barrera» y la oposición de reyes para dar mate con la torre.',
    techniqueSteps: [
      'Corta al rey negro por una fila con tu torre (por ejemplo Ta6 o Ta5) impidiéndole avanzar hacia el centro.',
      'Acerca tu rey buscando la oposición directa (frente a frente con una casilla de por medio).',
      'Cuando ambos reyes estén en oposición, da jaque lateral con la torre para empujar al rey enemigo una fila más hacia el borde.',
    ],
    commonMistakeToAvoid:
      'No des jaques innecesarios con la torre si tu rey aún no está en oposición; solo ayudarás al rey rival a escapar hacia el centro.',
  },
  {
    id: 'end-rey-peon-oposicion',
    title: '3. Final de Peones: La Oposición y las Casillas Críticas (R+P vs R)',
    category: 'Finales de peones',
    difficulty: 'intermedio',
    fen: '4k3/8/8/8/4P3/4K3/8/8 w - - 0 1',
    playerColor: 'w',
    targetOutcome: 'win',
    objectiveText: 'Conquista las casillas críticas delante de tu peón (d6, e6, f6) para coronar.',
    techniqueSteps: [
      'Regla de oro: ¡El Rey debe ir SIEMPRE por delante del peón! Juega 1.Rd4 o 1.Rf4 antes de avanzar el peón.',
      'Gana la oposición situando tu rey en la sexta fila (d6, e6 o f6) frente al rey negro.',
      'Solo avanza el peón cuando tu rey ya controle la casilla de coronación e8.',
    ],
    commonMistakeToAvoid:
      'Si avanzas el peón primero (1.e5?), el rey negro tomará la oposición con 1...Re7 y la partida será tablas teóricas.',
  },
  {
    id: 'end-regla-cuadrado',
    title: '4. Final de Peones: Ruptura y Peón Pasado Alejado',
    category: 'Finales de peones',
    difficulty: 'intermedio',
    fen: '8/5pk1/6p1/P7/3K4/8/5PPP/8 w - - 0 1',
    playerColor: 'w',
    targetOutcome: 'win',
    objectiveText: 'Usa tu peón pasado alejado en la columna a para desviar al rey negro y ganar el flanco de rey.',
    techniqueSteps: [
      'Avanza el peón pasado de la columna a (a5-a6-a7) para obligar al rey negro a abandonar la defensa de sus peones de f7 y g6.',
      'Mientras el rey negro va a capturar el peón de a, invade con tu rey blanco hacia f4-e5-f6 y captura los peones negros.',
    ],
    commonMistakeToAvoid:
      'No cambies tu peón pasado sin antes acercar tu rey al centro para aprovechar la desviación del rey enemigo.',
  },
  {
    id: 'end-torres-lucena',
    title: '5. Final de Torres: Posición de Lucena («Construir el Puente»)',
    category: 'Finales de torres',
    difficulty: 'avanzado',
    fen: '1K2k3/1P6/8/8/8/8/2r5/3R4 w - - 0 1',
    playerColor: 'w',
    targetOutcome: 'win',
    objectiveText: 'Saca a tu rey de delante del peón de b7 construyendo «el puente» en la cuarta fila.',
    techniqueSteps: [
      'Primero da jaque para alejar al rey negro una columna o lleva tu torre a la 4ª fila (1.Td4!).',
      'Después saca tu rey de b8 (hacia a7 o c7). Cuando la torre negra empiece a dar jaques verticales desde abajo, avanza tu rey hacia la torre y cubre el jaque interponiendo tu torre en b4 («el puente»).',
    ],
    commonMistakeToAvoid:
      'Si sacas el rey inmediatamente con 1.Ra7? sin haber llevado antes tu torre a la cuarta fila, las negras te darán jaques perpetuos desde atrás.',
  },
  {
    id: 'end-torres-philidor',
    title: '6. Defensa de Torres: Posición de Philidor (Lograr Tablas con Negras)',
    category: 'Finales de torres',
    difficulty: 'avanzado',
    fen: '3k4/8/2R5/3KP3/8/8/8/1r6 b - - 0 1',
    playerColor: 'b',
    targetOutcome: 'draw',
    objectiveText: 'Defiende con precisión usando la 6ª fila (tercera desde tu lado) para asegurar las tablas.',
    techniqueSteps: [
      'Coloca tu torre en la sexta fila (1...Tb6!) para impedir que el rey blanco pase a d6 o e6.',
      'Mantén tu torre en la sexta fila esperando tranquilamente hasta que el blanco avance el peón a e6.',
      'En el instante en que el peón blanco avance a e6, lleva inmediatamente tu torre al fondo (Tb1) para dar jaques por detrás al rey blanco que ya no tiene refugio.',
    ],
    commonMistakeToAvoid:
      'No des jaques desde atrás mientras el peón blanco siga en la 5ª fila (e5), porque el rey blanco se esconderá en e6/d6 ganando la partida.',
  },
];

const ENDGAME_STORAGE_KEY = 'ccai_endgame_completed_v1';

export function loadCompletedEndgames(): Record<string, { completedAt: string; movesCount: number }> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(ENDGAME_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function markEndgameCompleted(drillId: string, movesCount: number): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const cur = loadCompletedEndgames();
    cur[drillId] = { completedAt: new Date().toISOString(), movesCount };
    localStorage.setItem(ENDGAME_STORAGE_KEY, JSON.stringify(cur));
  } catch {
    // Ignorado
  }
}
