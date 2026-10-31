/**
 * Catálogo de aperturas (código ECO, nombre en español, secuencia de jugadas y plan típico).
 * Se indexa por el FEN normalizado (primeros 4 campos) tras aplicar la secuencia, de modo
 * que también reconoce transposiciones.
 */
import { Chess } from 'chess.js';
import { fenKey } from './utils';

export interface OpeningEntry {
  eco: string;
  name: string;
  moves: string[];
  planWhite: string;
  planBlack: string;
}

const RAW_OPENINGS: OpeningEntry[] = [
  {
    eco: 'B00', name: 'Apertura de Peón de Rey', moves: ['e4'],
    planWhite: 'Ocupar el centro con e4/d4 y desarrollar rápidamente caballos y alfiles.',
    planBlack: 'Disputar el centro (e5, c5, e6 o c6) antes de que las blancas consoliden d4.',
  },
  {
    eco: 'C20', name: 'Apertura Abierta (1.e4 e5)', moves: ['e4', 'e5'],
    planWhite: 'Desarrollar Cf3 y Ac4/Ab5 presionando f7 y el peón de e5.',
    planBlack: 'Defender e5 con Cc6, desarrollar Cf6/Ac5 y enrocar pronto.',
  },
  {
    eco: 'C44', name: 'Apertura de Caballo de Rey', moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    planWhite: 'Elegir entre presión sobre f7 (Italiana), sobre c6 (Española) o ruptura central con d4 (Escocesa).',
    planBlack: 'Mantener el punto fuerte e5 y completar el desarrollo del flanco de rey.',
  },
  {
    eco: 'C50', name: 'Apertura Italiana (Giuoco Piano)', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    planWhite: 'Preparar c3 y d4 para construir un centro de peones clásico y apuntar a f7.',
    planBlack: 'Desarrollar Cf6, d6 o golpear el centro blanco con d5 en el momento oportuno.',
  },
  {
    eco: 'C53', name: 'Apertura Italiana: línea principal con c3', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4'],
    planWhite: 'Sostener el centro d4-e4 y aprovechar las columnas abiertas tras los cambios.',
    planBlack: 'Contraatacar el centro con exd4 y Ab4+ o d5.',
  },
  {
    eco: 'C55', name: 'Defensa de los Dos Caballos', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    planWhite: 'Presionar f7 con Cg5 o consolidar con d3/c3.',
    planBlack: 'Buscar contrajuego activo con d5 entregando un peón por iniciativa.',
  },
  {
    eco: 'C60', name: 'Apertura Española (Ruy López)', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    planWhite: 'Presionar indirectamente el peón de e5 atacando a su defensor en c6, enrocar y preparar c3-d4.',
    planBlack: 'Expulsar o cuestionar al alfil con a6, desarrollar Cf6/Ae7 y sostener e5.',
  },
  {
    eco: 'C65', name: 'Apertura Española: Defensa Berlinesa', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
    planWhite: 'Enrocar y presionar e5 con Te1 o d3/d4.',
    planBlack: 'Contraatacar e4 con Cxe4 y simplificar hacia una estructura sólida.',
  },
  {
    eco: 'C78', name: 'Apertura Española: Variante Morphy', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'],
    planWhite: 'Defender e4 con Te1, preparar c3 y d4 y maniobrar Cbd2-f1-g3.',
    planBlack: 'Desarrollar Ae7, b5, d6 y O-O manteniendo flexible el centro.',
  },
  {
    eco: 'C45', name: 'Apertura Escocesa', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'],
    planWhite: 'Aprovechar la ventaja de espacio central y las líneas abiertas para las piezas.',
    planBlack: 'Atacar el caballo centralizado en d4 con Ac5 o Cf6 y presionar e4.',
  },
  {
    eco: 'C42', name: 'Defensa Petrov (Rusa)', moves: ['e4', 'e5', 'Nf3', 'Nf6'],
    planWhite: 'Capturar en e5 o abrir el centro con d4 buscando iniciativa.',
    planBlack: 'Recapturar en e4 tras d6 y mantener una posición simétrica y sólida.',
  },
  {
    eco: 'C41', name: 'Defensa Philidor', moves: ['e4', 'e5', 'Nf3', 'd6', 'd4'],
    planWhite: 'Ganar espacio central y presionar el punto e5 y la casilla f7.',
    planBlack: 'Sostener e5 con Cd7/Cf6 y desarrollar Ae7 antes de enrocar.',
  },
  {
    eco: 'C30', name: 'Gambito de Rey', moves: ['e4', 'e5', 'f4'],
    planWhite: 'Desviar el peón de e5 para dominar el centro con d4 y abrir la columna f.',
    planBlack: 'Contraatacar en el centro con d5 o desarrollar Ac5 vigilando la diagonal a7-g1.',
  },
  {
    eco: 'B20', name: 'Defensa Siciliana', moves: ['e4', 'c5'],
    planWhite: 'Abrir el juego con Cf3 y d4 (Siciliana Abierta) o jugar un esquema cerrado con Cc3/c3.',
    planBlack: 'Cambiar el peón lateral c por el central d4 para obtener mayoría central y la columna c semiabierta.',
  },
  {
    eco: 'B22', name: 'Defensa Siciliana: Variante Alapin (2.c3)', moves: ['e4', 'c5', 'c3'],
    planWhite: 'Establecer un centro de peones completo con d4.',
    planBlack: 'Atacar inmediatamente el centro con Cf6 o d5.',
  },
  {
    eco: 'B50', name: 'Defensa Siciliana Abierta', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
    planWhite: 'Desarrollar Ae3/Ae2, enrocar y lanzar un ataque en el flanco de rey o centro.',
    planBlack: 'Presionar por la columna c, preparar b5/d5 y disputar la casilla d4.',
  },
  {
    eco: 'B90', name: 'Defensa Siciliana: Variante Najdorf', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    planWhite: 'Atacar con Ae3, f3, Dd2 y g4 (ataque inglés) o presionar d6/e5 con Ag5.',
    planBlack: 'Expandirse en el flanco de dama con b5 y luchar por la casilla e5 o d5.',
  },
  {
    eco: 'B70', name: 'Defensa Siciliana: Variante del Dragón', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    planWhite: 'Jugar Ae3, f3, Dd2, O-O-O y atacar el enroque negro con h4-h5 y Ah6.',
    planBlack: 'Activar el alfil de g7 en la gran diagonal y contragolpear por la columna c.',
  },
  {
    eco: 'B30', name: 'Defensa Siciliana con 2...Cc6', moves: ['e4', 'c5', 'Nf3', 'Nc6'],
    planWhite: 'Abrir con d4 o dar jaque con Ab5 (Rossolimo).',
    planBlack: 'Controlar d4 y elegir entre e5 (Sveshnikov/Kalashnikov), e6 o g6.',
  },
  {
    eco: 'C00', name: 'Defensa Francesa', moves: ['e4', 'e6', 'd4', 'd5'],
    planWhite: 'Mantener la cadena de peones d4-e5 y atacar en el flanco de rey.',
    planBlack: 'Minar la base de la cadena blanca con c5 y f6, activando las piezas en el flanco de dama.',
  },
  {
    eco: 'C02', name: 'Defensa Francesa: Variante del Avance', moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3'],
    planWhite: 'Sostener el punto d4 con c3 y Cf3, preparando el desarrollo del flanco de rey.',
    planBlack: 'Acumular presión sobre d4 con Cc6, Db6 y Cf5.',
  },
  {
    eco: 'B10', name: 'Defensa Caro-Kann', moves: ['e4', 'c6', 'd4', 'd5'],
    planWhite: 'Aprovechar la ventaja de espacio central (e5, Cc3 o cambio exd5).',
    planBlack: 'Desarrollar el alfil de casillas blancas fuera de la cadena (Af5/Ag4) antes de jugar e6 y romper con c5.',
  },
  {
    eco: 'B12', name: 'Defensa Caro-Kann: Variante del Avance', moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'],
    planWhite: 'Controlar espacio y disputar la diagonal h2-b8 sin debilitar el centro.',
    planBlack: 'Jugar e6 y c5 para atacar la base de la cadena en d4.',
  },
  {
    eco: 'B01', name: 'Defensa Escandinava', moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
    planWhite: 'Ganar tiempos sobre la dama negra con Cc3 y desarrollar rápido con d4 y Cf3.',
    planBlack: 'Retirar la dama a a5 o d6, jugar c6/Af5 y mantener una estructura sólida.',
  },
  {
    eco: 'B07', name: 'Defensa Pirc', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
    planWhite: 'Ocupar el centro y elegir entre un esquema agresivo (Ae3, f4/f3) o posicional (Cf3, Ae2).',
    planBlack: 'Enfianquetar el alfil en g7 y golpear el centro blanco con c5 o e5.',
  },
  {
    eco: 'B02', name: 'Defensa Alekhine', moves: ['e4', 'Nf6'],
    planWhite: 'Avanzar e5 con prudencia y sostener los peones avanzados con piezas.',
    planBlack: 'Provocar el avance de los peones blancos para atacarlos después con d6 y c5.',
  },
  {
    eco: 'D00', name: 'Apertura de Peón de Dama', moves: ['d4', 'd5'],
    planWhite: 'Presionar el centro con c4 (Gambito de Dama) o desarrollar con Af4/Cf3 (Sistema Londres).',
    planBlack: 'Sostener d5 con e6 o c6 y liberar el alfil de c8.',
  },
  {
    eco: 'D02', name: 'Sistema Londres', moves: ['d4', 'd5', 'Bf4'],
    planWhite: 'Construir una pirámide sólida (c3, d4, e3) con el alfil fuera de la cadena en f4 y plantar un caballo en e5.',
    planBlack: 'Contraatacar en el flanco de dama con c5 y Db6 presionando b2 y d4.',
  },
  {
    eco: 'D06', name: 'Gambito de Dama', moves: ['d4', 'd5', 'c4'],
    planWhite: 'Presionar el peón central d5 para ganar control de e4 y abrir la columna c.',
    planBlack: 'Defender d5 con e6 (Rechazado), c6 (Eslava) o capturar dxc4 para devolver el peón tras desarrollar.',
  },
  {
    eco: 'D30', name: 'Gambito de Dama Rechazado', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    planWhite: 'Desarrollar Ag5/Af4, cambiar en d5 para crear ataque de las minorías o presionar el centro.',
    planBlack: 'Completar el desarrollo con Ae7, O-O y preparar la ruptura liberadora c5 o e5.',
  },
  {
    eco: 'D10', name: 'Defensa Eslava', moves: ['d4', 'd5', 'c4', 'c6'],
    planWhite: 'Desarrollar Cf3 y Cc3 manteniendo la tensión en d5 y vigilando dxc4.',
    planBlack: 'Sostener d5 sin encerrar el alfil de c8, sacándolo a f5 o g4 antes de jugar e6.',
  },
  {
    eco: 'E60', name: 'Defensa India de Rey', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    planWhite: 'Consolidar el gran centro y progresar en el flanco de dama con c5.',
    planBlack: 'Enrocar y golpear el centro con e5 o c5, buscando ataque en el flanco de rey con f5.',
  },
  {
    eco: 'E20', name: 'Defensa Nimzo-India', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    planWhite: 'Luchar por la casilla e4 y compensar posibles peones doblados con la pareja de alfiles.',
    planBlack: 'Clavar el caballo de c3 para impedir e4 y presionar las casillas blancas centrales.',
  },
  {
    eco: 'E12', name: 'Defensa India de Dama', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
    planWhite: 'Disputar la gran diagonal con g3 y Ag2 manteniendo ventaja de espacio.',
    planBlack: 'Controlar e4 a distancia con Ab7 y preparar d5 o c5.',
  },
  {
    eco: 'D80', name: 'Defensa Grünfeld', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    planWhite: 'Cambiar en d5 para construir un potente centro de peones e4-d4.',
    planBlack: 'Presionar el centro blanco a distancia con Ag7, c5 y Cc6.',
  },
  {
    eco: 'A80', name: 'Defensa Holandesa', moves: ['d4', 'f5'],
    planWhite: 'Enfianquetar en g2 y presionar la diagonal h1-a8 y las casillas blancas debilitadas por f5.',
    planBlack: 'Controlar la casilla e4 y preparar un ataque en el flanco de rey.',
  },
  {
    eco: 'A10', name: 'Apertura Inglesa', moves: ['c4'],
    planWhite: 'Controlar d5 desde el flanco, a menudo combinado con g3 y Ag2.',
    planBlack: 'Responder con e5 (Siciliana invertida), c5 (simétrica) o esquemas indios con Cf6.',
  },
  {
    eco: 'A04', name: 'Apertura Réti', moves: ['Nf3', 'd5', 'c4'],
    planWhite: 'Presionar el centro a distancia con peones de flanco y alfiles en fianchetto.',
    planBlack: 'Sostener d5 con c6 o e6 o avanzar d4 si cuenta con buen apoyo de piezas.',
  },
];

interface IndexedOpening extends OpeningEntry {
  ply: number;
  fenKey: string;
}

const BY_FEN = new Map<string, IndexedOpening>();
const BY_PREFIX_FEN = new Map<string, OpeningEntry>();

for (const op of RAW_OPENINGS) {
  const c = new Chess();
  let ok = true;
  for (const m of op.moves) {
    try {
      c.move(m);
      if (!BY_PREFIX_FEN.has(fenKey(c.fen()))) {
        BY_PREFIX_FEN.set(fenKey(c.fen()), op);
      }
    } catch {
      ok = false;
      break;
    }
  }
  if (ok) {
    BY_FEN.set(fenKey(c.fen()), { ...op, ply: op.moves.length, fenKey: fenKey(c.fen()) });
  }
}

/**
 * Comprueba si un FEN concreto pertenece a una línea teórica de apertura del catálogo.
 */
export function isKnownBookPosition(fen: string): OpeningEntry | null {
  const k = fenKey(fen);
  return BY_FEN.get(k) ?? BY_PREFIX_FEN.get(k) ?? null;
}

/**
 * Identifica la apertura más específica alcanzada a lo largo de la partida (dada la lista
 * de FENs visitados desde el inicio). Devuelve null si la partida empezó desde un FEN
 * personalizado o no coincide con ninguna apertura del catálogo.
 */
export function detectOpening(fens: string[]): OpeningEntry | null {
  let best: IndexedOpening | null = null;
  for (const f of fens.slice(0, 22)) {
    const hit = BY_FEN.get(fenKey(f));
    if (hit && (!best || hit.ply >= best.ply)) best = hit;
  }
  return best;
}

