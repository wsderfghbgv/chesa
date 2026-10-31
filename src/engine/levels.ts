/**
 * Niveles de fuerza del rival.
 *
 * IMPORTANTE: los nombres son CATEGORÍAS ORIENTATIVAS. No se asocian a un Elo humano
 * porque la fuerza efectiva de Stockfish limitado depende de la versión del motor, de la
 * red neuronal (aquí la red "lite"), del hardware, del número de hilos y del tiempo por
 * jugada. Ninguna de estas configuraciones ha sido calibrada contra jugadores humanos con
 * Elo FIDE; asignarles un número sería inventarlo.
 *
 * Mecanismos usados para debilitar el motor:
 *  - Niveles 1–2: política propia y transparente. El motor calcula varias jugadas (MultiPV)
 *    a muy poca profundidad y se elige una al azar ponderando por su evaluación (softmax con
 *    "temperatura"), con una pequeña probabilidad de jugada aleatoria. Simula errores
 *    humanos de cálculo, pero siempre con jugadas legales.
 *  - Niveles 3–8: opción UCI nativa "Skill Level" (0–20) de Stockfish, combinada con un
 *    límite de profundidad y de tiempo. Con Skill Level < 20 el propio Stockfish elige a
 *    veces jugadas subóptimas entre sus mejores candidatas.
 *  - Nivel 9: fuerza completa, sin límite de profundidad, solo limitado por el tiempo.
 */
export interface RandomPolicy {
  multipv: number;
  /** Temperatura en centipeones: cuanto mayor, más aleatoria la elección. */
  temperatureCp: number;
  /** Probabilidad de jugar una jugada legal completamente aleatoria. */
  randomMoveChance: number;
}

export interface StrengthLevel {
  id: string;
  index: number;
  name: string;
  description: string;
  skill: number;
  depth: number | null;
  movetime: number;
  policy?: RandomPolicy;
}

export const LEVELS: StrengthLevel[] = [
  {
    id: 'principiante', index: 1, name: 'Principiante',
    description: 'Calcula apenas una jugada y elige con mucha aleatoriedad. Deja piezas colgadas con frecuencia.',
    skill: 0, depth: 1, movetime: 150,
    policy: { multipv: 8, temperatureCp: 260, randomMoveChance: 0.15 },
  },
  {
    id: 'principiante-avanzado', index: 2, name: 'Principiante avanzado',
    description: 'Ve capturas simples, pero comete errores tácticos de forma regular.',
    skill: 0, depth: 3, movetime: 200,
    policy: { multipv: 6, temperatureCp: 120, randomMoveChance: 0.05 },
  },
  {
    id: 'intermedio', index: 3, name: 'Intermedio',
    description: 'Stockfish con Skill Level 2 y profundidad 5. Juega con sentido pero falla en táctica.',
    skill: 2, depth: 5, movetime: 300,
  },
  {
    id: 'intermedio-avanzado', index: 4, name: 'Intermedio avanzado',
    description: 'Skill Level 5, profundidad 7. Castiga errores evidentes.',
    skill: 5, depth: 7, movetime: 400,
  },
  {
    id: 'avanzado', index: 5, name: 'Avanzado',
    description: 'Skill Level 8, profundidad 9. Táctica sólida a corto plazo.',
    skill: 8, depth: 9, movetime: 500,
  },
  {
    id: 'experto', index: 6, name: 'Experto',
    description: 'Skill Level 11, profundidad 11. Rara vez deja material.',
    skill: 11, depth: 11, movetime: 700,
  },
  {
    id: 'maestro', index: 7, name: 'Maestro',
    description: 'Skill Level 14, profundidad 14. Comprensión posicional y táctica fuertes.',
    skill: 14, depth: 14, movetime: 1000,
  },
  {
    id: 'gran-maestro', index: 8, name: 'Gran Maestro',
    description: 'Skill Level 17, profundidad 18. Muy difícil de batir.',
    skill: 17, depth: 18, movetime: 1500,
  },
  {
    id: 'maximo', index: 9, name: 'Nivel máximo del motor',
    description: 'Stockfish sin limitaciones de fuerza; solo lo limita el tiempo por jugada configurado.',
    skill: 20, depth: null, movetime: 2500,
  },
];

export const LEVEL_DISCLAIMER =
  'Los nombres de los niveles son categorías orientativas, no un Elo. La fuerza real depende ' +
  'de la versión de Stockfish (19, red "lite"), del dispositivo, del número de hilos y del ' +
  'tiempo por jugada. Ninguna configuración se ha calibrado contra jugadores humanos, así que ' +
  'no se muestra un Elo equivalente.';

export function getLevel(id: string): StrengthLevel {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[2];
}

