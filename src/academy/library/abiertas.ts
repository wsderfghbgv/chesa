import type { OpeningDef } from '../types';

export const OPEN_OPENINGS: OpeningDef[] = [
  {
    id: 'italiana',
    name: 'Apertura Italiana (Giuoco Piano)',
    short: 'Italiana',
    eco: 'C50',
    category: 'abiertas',
    side: 'w',
    studyAs: 'w',
    level: 'basico',
    popularity: 5,
    frequency: 'Omnipresente desde nivel principiante hasta la élite mundial (Giuoco Pianissimo con c3 y d3).',
    history:
      'Documentada en los manuscritos de Damiano (1512), Gioachino Greco (1620) y Giulio Cesare Polerio, la Apertura Italiana es una de las más antiguas del ajedrez moderno. Durante el siglo XIX dominó las líneas románticas con d4 inmediato, y en el siglo XXI ha vivido un renacimiento en la élite con sistemas posicionales con c3, d3 y maniobras tipo Española.',
    goals: [
      'Desarrollar rápidamente el caballo de f3 y el alfil a c4 apuntando a la casilla más débil de las negras: f7.',
      'Construir un centro de peones ideal mediante c3 y d4 o sostener una estructura flexible con c3 y d3.',
      'Enrocar temprano para activar la torre de f1 en la columna e.',
    ],
    plans: {
      w: [
        'Preparar la ruptura central temática con c3 y d4 ganando tiempo sobre el alfil negro de c5.',
        'En el Giuoco Pianissimo (d3), llevar el caballo de b1 por d2-f1-g3 (o e3) y expandir el flanco de dama con a4 y b4.',
      ],
      b: [
        'Responder a d4 con ...exd4 seguido del contraataque central ...Ab4+ o ...d5 para liberar sus piezas.',
        'En esquemas con d3, jugar ...a6 (o ...a5) para darle refugio al alfil de c5 en a7 y disputar el centro con ...d6 y ...Ae6.',
      ],
    },
    structures: [
      'Centro clásico e4+d4 tras c3 y d4: tras ...exd4 cxd4 las blancas tienen peones centrales móviles y las negras presionan d4 y e4.',
      'Estructura simétrica e4/d3 contra e5/d6 (Giuoco Pianissimo): juego de maniobras similar a la Apertura Española.',
    ],
    keySquares: [
      { square: 'f7', role: 'Punto más vulnerable del campo negro al inicio, defendido únicamente por el rey.' },
      { square: 'd4', role: 'Casilla clave de ruptura central blanca apoyada por el peón de c3.' },
      { square: 'c5', role: 'Casilla activa del alfil negro que presiona f2 y vigila d4.' },
      { square: 'a7', role: 'Casilla de retirada esencial para el alfil negro tras ...a6 o ...a5.' },
    ],
    development: [
      { piece: 'Caballo de g1', idea: 'Se desarrolla a f3 en la jugada 2 atacando e5 y controlando d4.' },
      { piece: 'Alfil de f1', idea: 'Sale a c4 en la jugada 3 apuntando directamente a la diagonal a2-g8 (f7).' },
      { piece: 'Alfil de c1', idea: 'Apoya desde e3 o g5 una vez definido el centro.' },
      { piece: 'Caballo de b1', idea: 'Sale por d2 hacia f1-g3 si hay peón en c3, o a c3 en las líneas abiertas.' },
    ],
    commonMistakes: [
      'Lanzar Cg5 prematuramente contra ...Ac5 cuando las negras ya tienen ...Cf6 o pueden defender f7 ganando tiempos.',
      'Jugar Cc3 bloqueando el peón c si el plan era construir el centro con c3 y d4.',
      'Olvidar retirar el alfil de c4/c5 ante el avance b4 o d4 perdiendo tiempos cruciales.',
    ],
    traps: [
      {
        id: 'italiana-trampa-centro-d4',
        name: 'Celada de Greco tras 5...Axd4? en lugar de 5...Ab4+',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb6 d5 Ne7 e5 Ng4 d6',
        victim: 'b',
        mistakePly: 10,
        explanation:
          'Tras 5.d4 exd4 6.cxd4, las negras deben dar jaque con 6...Ab4+! Si retiran pasivamente 6...Ab6?, la avalancha central 7.d5 Ce7 8.e5 Cg4 9.d6! asfixia por completo la posición negra y amenaza f7 al mismo tiempo.',
      },
    ],
    famousGames: [
      {
        white: 'Wilhelm Steinitz',
        black: 'Curt von Bardeleben',
        event: 'Torneo Internacional de Hastings',
        year: 1895,
        result: '1-0',
        note: 'Obra maestra inmortal del primer campeón mundial en el Giuoco Piano (c3 y d4), culminada con el sacrificio de torre 17.d5!! y la persecución del rey negro por séptima fila.',
      },
    ],
    lines: [
      {
        id: 'italiana-principal',
        name: 'Giuoco Piano Clásico (4.c3 Cf6 5.d4)',
        kind: 'principal',
        eco: 'C54',
        idea: 'Construir un centro de peones en e4 y d4 mediante el apoyo previo de c3.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5',
        notes: {
          1: [
            'Ocupa la casilla central e4, controla d5 y f5 y abre inmediatamente las diagonales para la dama y el alfil de f1.',
            'Establece presencia blanca en el centro desde la primera jugada y marca el inicio de las aperturas abiertas.',
            'Alternativas principales como 1.d4 o 1.c4 llevan a esquemas más estratégicos y cerrados.',
          ],
          2: [
            'Las negras responden simétricamente en el centro con e5, impidiendo que las blancas avancen d4 sin preparación y liberando su alfil de f8.',
            'Se equilibra el espacio central y ambas partes lucharán por el control de d4 y e5.',
            'Otras defensas como 1...c5 (Siciliana), 1...e6 (Francesa) o 1...c6 (Caro-Kann) plantean luchas asimétricas.',
          ],
          3: [
            'Desarrolla el caballo del flanco de rey hacia su mejor casilla natural f3, atacando directamente el peón negro de e5 y controlando d4.',
            'Obliga a las negras a tomar una decisión inmediata para defender su peón central mientras prepara el enroque corto.',
            '2.Cc3 (Vienesa) o 2.Ac4 (Alfil de Rey) son jugables pero no presionan e5 de inmediato.',
          ],
          4: [
            'Desarrolla el caballo a c6 defendiendo el peón de e5 y reforzando el control sobre la casilla central d4.',
            'Mantiene el equilibrio de desarrollo sin debilitar la estructura de peones del flanco de rey.',
            '2...Cf6 es la sólida Defensa Petrov (contraatacando e4) y 2...d6 es la Defensa Philidor.',
          ],
          5: [
            'El alfil se instala en la diagonal activa a2-g8 apuntando al punto f7, que solo está defendido por el rey negro.',
            'Define la Apertura Italiana: las blancas despejan la primera fila para enrocar corto y presionan el centro y f7.',
            '3.Ab5 plantea la Apertura Española (Ruy López) y 3.d4 abre de inmediato la Apertura Escocesa.',
          ],
          6: [
            'Las negras desarrollan su alfil a c5 (Giuoco Piano), apuntando a f2, controlando d4 y preparando también su propio enroque corto.',
            'Ambas partes tienen sus alfiles en las diagonales más activas; la lucha girará en torno al avance d4.',
            '3...Cf6 es la combativa Defensa de los Dos Caballos, que invita a 4.Cg5 o 4.d3.',
          ],
          7: [
            'Prepara la ruptura central d4 con apoyo de peón para poder recapturar cxd4 y mantener una pareja de peones centrales en d4 y e4.',
            'Además le abre la diagonal d1-a4 a la dama y restringe los saltos del caballo negro de c6.',
            '4.d3 entra en el Giuoco Pianissimo (juego más tranquilo y posicional) y 4.b4 es el agudo Gambito Evans.',
          ],
          8: [
            'Las negras desarrollan el caballo a f6 contraatacando de inmediato el peón blanco de e4 antes de que las blancas consoliden el centro.',
            'Activa otra pieza menor, prepara el enroque corto y prepara el golpe liberador ...d5.',
            'Una jugada pasiva como 4...d6 permitiría a las blancas realizar 5.d4 sin ninguna presión sobre e4.',
          ],
          9: [
            'Las blancas ejecutan la ruptura temática d4, ganando tiempo al atacar el alfil de c5 y cuestionando el peón central e5.',
            'Se abre el centro mientras el rey negro aún no ha enrocado, exigiendo máxima precisión defensiva a las negras.',
            '5.d3 sigue siendo muy popular hoy en día para mantener la tensión central sin simplificar.',
          ],
          10: [
            'Las negras deben capturar en d4 para deshacer la amenaza sobre su alfil de c5 y abrir la columna e.',
            'Elimina el peón blanco de d4 temporalmente antes de que las blancas ganen espacio con d5.',
            'Retirar el alfil con 5...Ab6? sería un grave error posicional tras 6.dxe5 Cxe4 7.Dd5.',
          ],
          11: [
            'Las blancas recapturan con el peón de c3, restableciendo un imponente centro de peones en d4 y e4 con ganancia de tiempo sobre el alfil negro.',
            'Se abre la columna c para las torres blancas y la casilla c3 queda libre si más adelante se necesita.',
            '6.e5?! es una línea secundaria interesante (con 6...d5!), pero 6.cxd4 es la continuación principal.',
          ],
          12: [
            '¡Jugada clave! Las negras se retiran dando jaque en b4 para no perder tiempo y romper la coordinación del centro blanco.',
            'Fuerza a las blancas a cubrir el jaque y les permite a las negras preparar la ruptura liberadora ...d5.',
            '6...Ab6? sin jaque permite 7.d5 y 8.e5 con ventaja clara para las blancas.',
          ],
          13: [
            'Cubre el jaque con el alfil proponiendo el cambio de alfiles de casillas negras para conservar protegido el peón de e4.',
            'Evita el sacrificio de peón de la línea 7.Cc3 Cxe4 y conduce a una posición estratégica muy instructiva.',
            '7.Cc3!? es el Gambito Greco-Steinitz (7...Cxe4 8.O-O), muy agudo y táctico.',
          ],
          14: [
            'Las negras cambian en d2 para desviar el caballo blanco a d2 antes de golpear el centro con ...d5.',
            'Si capturasen 7...Cxe4?! directamente, tras 8.Axb4 Cxb4 9.Axf7+ Rxf7 10.Db3+ las blancas tendrían gran iniciativa.',
            'Simplifica una pareja de piezas menores para aliviar la falta de espacio.',
          ],
          15: [
            'El caballo recaptura en d2 defendiendo simultáneamente el peón central de e4 y preparando el enroque corto.',
            'Todas las piezas menores blancas están desarrolladas y listas para conectar las torres.',
            'Capturar con la dama dejaría el peón de e4 indefenso ante ...Cxe4.',
          ],
          16: [
            'El contragolpe liberador temático de las negras: disputan el centro de inmediato y abren la diagonal de su alfil de c8.',
            'Tras 9.exd5 Cxd5 las negras igualan la lucha central a cambio de dejar un peón blanco aislado en d4 con juego activo de piezas.',
            'Si las negras jugasen 8...O-O pasivo, 9.d5 daría a las blancas una cómoda ventaja de espacio.',
          ],
        },
      },
      {
        id: 'italiana-pianissimo',
        name: 'Giuoco Pianissimo (4.c3 Cf6 5.d3)',
        kind: 'secundaria',
        eco: 'C53',
        idea: 'Mantener un centro flexible con c3 y d3 para maniobrar con los caballos y preparar d4 en el momento óptimo.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 Ba7',
        notes: {
          9: [
            'En lugar de abrir el centro de inmediato con d4, las blancas sostienen sólidamente el peón de e4 con d3.',
            'Evita las simplificaciones tempranas de ...Ab4+ y ...d5, manteniendo todas las piezas en el tablero para una lucha estratégica.',
            '5.d4 es la línea clásica abierta.',
          ],
          10: [
            'Las negras consolidan e5 con ...d6 y abren la diagonal para su alfil de c8.',
            'Con el centro cerrado, ambos bandos maniobrarán buscando las mejores casillas para sus piezas menores.',
            '5...a6 también es muy habitual para asegurar de inmediato la retirada del alfil a a7.',
          ],
          11: 'Las blancas ponen su rey a salvo y activan la torre de f1 antes de iniciar maniobras en el centro o en el flanco de dama.',
        },
      },
      {
        id: 'italiana-greco-cc3',
        name: 'Ataque Greco-Steinitz (7.Cc3 Cxe4)',
        kind: 'secundaria',
        eco: 'C54',
        idea: 'Sacrificar el peón de e4 tras 6...Ab4+ 7.Cc3 para acelerar el desarrollo y abrir columnas contra el rey negro.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 d5',
        notes: {
          13: [
            'Cubre el jaque desarrollando el caballo de b1 a su casilla más activa c3, ofreciendo el peón de e4 como sacrificio.',
            'Las blancas priorizan la velocidad de desarrollo y la iniciativa sobre el material.',
            '7.Ad2 es la alternativa tranquila que conserva el peón.',
          ],
          14: [
            'Las negras aceptan el reto capturando el peón central de e4 y aumentando la presión sobre el caballo clavado en c3.',
            'Es la prueba crítica del gambito: las negras ganan material pero deben defenderse con exactitud.',
            '7...d5 sin capturar en e4 daría ventaja a las blancas tras 8.exd5 Cxd5 9.O-O.',
          ],
          15: 'Las blancas se enrocan sin perder tiempo, desclavando el caballo y preparando Te1 o el avance intermedio d5 tras ...Axc3.',
        },
      },
    ],
  },
  {
    id: 'espanola',
    name: 'Apertura Española (Ruy López)',
    short: 'Española',
    eco: 'C84',
    category: 'abiertas',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 5,
    frequency: 'La piedra angular del ajedrez clásico; utilizada por todos los campeones mundiales.',
    history:
      'Analizada por el clérigo extremeño Ruy López de Segura en su «Libro de la invención liberal y arte del juego del axedrez» (Alcalá de Henares, 1561), la Apertura Española es sinónimo de comprensión estratégica profunda. Desde Paul Morphy y Wilhelm Steinitz hasta Bobby Fischer, Anatoly Karpov, Garry Kasparov y Magnus Carlsen, ha protagonizado innumerables duelos por el título mundial.',
    goals: [
      'Presionar al defensor del peón de e5 (el caballo de c6) mediante 3.Ab5.',
      'Preparar el enroque rápido, proteger e4 con Te1 y construir el centro ideal con c3 y d4.',
      'Maniobrar el caballo de b1 por d2-f1-g3 hacia el flanco de rey mientras se conserva el «alfil español» en c2 o b3.',
    ],
    plans: {
      w: [
        'Enrocar, jugar Te1, c3, h3 (evitando ...Ag4) y romper en el centro con d4.',
        'Llevar el caballo de dama por Cd2-Cf1-Cg3 para presionar el flanco de rey negro y la casilla f5.',
      ],
      b: [
        'Cuestionar el alfil con ...a6 y ...b5 teniendo siempre lista la retirada ...Aa7 o ...Ae7.',
        'Sostener el punto fuerte e5 (Defensa Chigorin con ...Ca5 y ...c5) o contraatacar con el Gambito Marshall (...d5).',
      ],
    },
    structures: [
      'Tensión central e4/d4 contra e5/d6: las blancas eligen cuándo cerrar con d5, cambiar dxe5 o mantener la tensión.',
      'Estructura del Cambio (4.Axc6 dxc6): cuatro peones blancos contra tres en el flanco de rey frente a la pareja de alfiles negra.',
    ],
    keySquares: [
      { square: 'c6', role: 'Caballo negro presionado que sostiene el peón central de e5.' },
      { square: 'e5', role: 'Punto neurálgico del centro negro bajo presión constante.' },
      { square: 'd4', role: 'Casilla donde las blancas ejecutan su ruptura central tras preparar c3 y Te1.' },
      { square: 'f5', role: 'Casilla de ataque en el flanco de rey a la que apunta el caballo blanco tras Cd2-f1-g3.' },
    ],
    development: [
      { piece: 'Alfil de f1 (alfil español)', idea: 'Va a b5, retrocede a a4-b3-c2 conservando su fuerza en la diagonal b1-h7.' },
      { piece: 'Torre de f1', idea: 'Se coloca en e1 tras el enroque para defender e4 y liberar el avance d4.' },
      { piece: 'Caballo de b1', idea: 'Recorre la ruta clásica b1-d2-f1-g3 (o e3) tras avanzar el peón a c3.' },
      { piece: 'Alfil de c1', idea: 'Se desarrolla a e3 o g5 (después de h3) una vez jugada d4.' },
    ],
    commonMistakes: [
      'Capturar 4.Axc6 dxc6 5.Cxe5? creyendo que se gana un peón, cuando 5...Dd4! recupera el peón con ventaja negra.',
      'Permitir la Trampa del Arca de Noé dejando encerrar el alfil español con ...c5 y ...c4 tras capturar en d4.',
      'Jugar d4 sin haber defendido antes el peón de e4 con Te1.',
    ],
    traps: [
      {
        id: 'espanola-trampa-arca-noe',
        name: 'Trampa del Arca de Noé (encierro del alfil español)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4',
        victim: 'w',
        mistakePly: 13,
        explanation:
          'Si las blancas codician el peón de d4 con 7.Dxd4? (jugada 13), las negras ganan tiempos sobre la dama con 7...c5 8.Dd5 Ae6 9.Dc6+ Ad7 10.Dd5 y atrapan el alfil de b3 con 10...c4! sin escapatoria.',
      },
    ],
    famousGames: [
      {
        white: 'Anatoly Karpov',
        black: 'Wolfgang Unzicker',
        event: 'Olimpiada de Niza',
        year: 1974,
        result: '1-0',
        note: 'Partida modelo posicional en la Variante Cerrada Chigorin: Karpov cierra el centro, dobla torres en la columna a con Aa7! y paraliza a todas las piezas negras.',
      },
    ],
    lines: [
      {
        id: 'espanola-principal',
        name: 'Variante Cerrada Morphy (3...a6 4.Aa4 Cf6 5.O-O Ae7)',
        kind: 'principal',
        eco: 'C84',
        idea: 'Preparar metódicamente el centro con Te1, c3 y d4 conservando el alfil español.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
        notes: {
          1: 'Las blancas ocupan el centro con e4, controlan d5 y abren la diagonal para que el alfil de f1 pueda salir activamente a b5.',
          2: 'Las negras fijan su peón en la casilla central e5, disputando el centro en igualdad de condiciones y liberando su alfil de f8.',
          3: 'El caballo sale a f3 atacando directamente el peón negro de e5, controlando d4 y preparando el rápido enroque corto.',
          4: 'Desarrolla el caballo de b8 a c6, la forma más activa y natural de proteger el peón central de e5 y controlar d4.',
          5: [
            'Jugada característica de la Apertura Española: el alfil presiona al caballo de c6, único defensor del peón de e5.',
            'Aún no amenaza ganar el peón de e5 (por la respuesta táctica ...Dd4), pero crea una presión duradera que obligará a las negras a definir sus peones del flanco de dama.',
            '3.Ac4 es la Italiana y 3.d4 es la Escocesa.',
          ],
          6: [
            'Defensa Morphy (3...a6): las negras preguntan de inmediato al alfil blanco qué intenciones tiene antes de desarrollar más piezas.',
            'El peón en a6 servirá para expulsar al alfil con ...b5 en el momento preciso.',
            '3...Cf6 es la sólida Defensa Berlinesa (muy empleada en la élite para llegar a finales complejos).',
          ],
          7: [
            'El alfil retrocede a a4 manteniendo la presión sobre c6 y reservando la casilla b3 tras un futuro ...b5.',
            'Conserva la pareja de alfiles y mantiene atadas las piezas negras a la defensa de e5.',
            '4.Axc6 dxc6 es la Variante del Cambio, donde las blancas buscan un final superior de peones a cambio de ceder la pareja de alfiles.',
          ],
          8: [
            'Las negras desarrollan su caballo de rey a f6 atacando el peón blanco de e4.',
            'Activa una pieza clave y prepara ...Ae7 o ...Ac5 seguido del enroque.',
            '4...b5 de inmediato liberaría al caballo de c6 demasiado pronto sin haber desarrollado el flanco de rey.',
          ],
          9: [
            'Las blancas se enrocan sin defender e4 todavía: si las negras capturan 5...Cxe4, entra la Variante Abierta pero el rey negro aún está en el centro.',
            'Pone al rey en seguridad y prepara Te1 para defender e4 y activar la torre.',
            '5.d3 o 5.Cc3 son líneas válidas pero menos incisivas que 5.O-O.',
          ],
          10: [
            'Variante Cerrada: las negras desarrollan el alfil a e7 cubriendo la columna e y preparando su enroque corto.',
            'Una vez que el alfil está en e7, la amenaza ...b5 seguida de ...Cxe4 pasa a ser real.',
            '5...Cxe4 es la Variante Abierta de la Española, aguda y muy rica tácticamente.',
          ],
          11: [
            'La torre se sitúa en e1 defendiendo el peón de e4, con lo que ahora sí las blancas amenazan realmente 7.Axc6 dxc6 8.Cxe5 ganando un peón.',
            'Además deja libre la casilla f1 para la maniobra clásica del caballo Cb1-d2-f1-g3.',
            '6.d3 también defiende e4 de forma más tranquila (Variante Anderssen).',
          ],
          12: [
            'Ahora que las blancas amenazaban ganar el peón de e5, las negras cortan la clavada avanzando ...b5 con ganancia de tiempo.',
            'Expulsa al alfil de a4 y gana espacio en el flanco de dama para desarrollar el alfil de c8 a b7 o e6.',
            '6...d6 sin ...b5 permitiría 7.Axc6+ bxc6 8.d4 con estructura negra dañada.',
          ],
          13: [
            'El alfil español se instala en su casilla ideal b3, desde donde apunta hacia d5 y f7.',
            'Queda protegido detrás de su cadena y sigue ejerciendo presión a largo plazo sobre el centro negro.',
            'No hay otra retirada activa.',
          ],
          14: [
            'Las negras sostienen firmemente el punto e5 con ...d6 y abren la diagonal para su alfil de c8.',
            'Si las negras se enrocasen primero con 7...O-O, las blancas tendrían la opción de entrar en el Gambito Marshall o evitarlo con 8.a4 / 8.h3.',
            '7...O-O invita a 8.c3 d5! (Ataque Marshall).',
          ],
          15: [
            'Prepara la ruptura central d4 con apoyo de peón y al mismo tiempo crea la casilla c2 para preservar al alfil español si las negras juegan ...Ca5.',
            'Cumple una doble función estratégica esencial en el esquema blanco.',
            '8.a4 cuestiona de inmediato el peón de b5.',
          ],
          16: [
            'Las negras completan el enroque corto, poniendo a su rey a salvo y preparando ...Ca5 o ...Te8 en el medio juego.',
            'Ambos bandos han completado la fase inicial de desarrollo y comienza la gran batalla estratégica tras 9.h3.',
            '8...Ca5 directamente antes de enrocar también es jugable.',
          ],
        },
      },
      {
        id: 'espanola-berlinesa',
        name: 'Defensa Berlinesa (3...Cf6 4.O-O Cxe4)',
        kind: 'secundaria',
        eco: 'C67',
        idea: 'Sólida defensa popularizada por Kramnik contra Kasparov en el año 2000.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
        notes: {
          6: [
            'La Defensa Berlinesa («el Muro de Berlín»): las negras desarrollan el caballo a f6 sin jugar ...a6 y contraatacan e4.',
            'Busca simplificar el centro rápidamente y confiar en la pareja de alfiles y una estructura compacta.',
            '3...a6 es la línea principal de Morphy.',
          ],
          8: 'Las negras capturan en e4 sabiendo que tras 5.d4 Cd6 recuperarán la igualdad material.',
          15: 'Se llega al célebre final de la Berlinesa: las blancas tienen mayoría de 4 contra 3 en el flanco de rey y las negras han perdido el enroque, pero poseen la pareja de alfiles en una posición semiabierta.',
        },
      },
      {
        id: 'espanola-cambio',
        name: 'Variante del Cambio (3...a6 4.Axc6 dxc6)',
        kind: 'secundaria',
        eco: 'C68',
        idea: 'Dañar la estructura de peones negra para crear una mayoría ganadora de 4 contra 3 en el flanco de rey.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1',
        notes: {
          7: [
            'Las blancas cambian en c6 de inmediato: ceden la pareja de alfiles pero doblan los peones negros en la columna c.',
            'Tras el cambio de peones en d4/e5, las blancas tienen una mayoría sana de 4 contra 3 en el flanco de rey mientras los 4 peones negros del flanco de dama no pueden crear un peón pasado por estar doblados.',
            '4.Aa4 mantiene la tensión.',
          ],
          8: 'Las negras deben recapturar hacia el centro con ...dxc6 para abrir las diagonales de su dama y de ambos alfiles.',
          10: '5...f6 es la defensa más sólida de Gligorić para sostener e5 sin entregar la pareja de alfiles.',
        },
      },
    ],
  },
  {
    id: 'escocesa',
    name: 'Apertura Escocesa',
    short: 'Escocesa',
    eco: 'C45',
    category: 'abiertas',
    side: 'w',
    studyAs: 'w',
    level: 'basico',
    popularity: 4,
    frequency: 'Muy popular en todos los niveles; revitalizada en la élite moderna por Garry Kasparov.',
    history:
      'Recibió su nombre del célebre encuentro por correspondencia entre los clubes de Edimburgo y Londres (1824–1828), donde los jugadores escoceses demostraron la fuerza de 3.d4. Considerada inofensiva durante parte del siglo XX, Garry Kasparov la recuperó en sus duelos mundiales de los años noventa contra Karpov y Short con un éxito arrollador.',
    goals: [
      'Abrir el centro en la tercera jugada con 3.d4 sin necesidad de preparar c3.',
      'Obtener ventaja de espacio central (peón en e4 contra ausencia de peones centrales negros) y líneas abiertas para los alfiles.',
      'Evitar la extensa teoría de la Española y de la Defensa Petrov tras 2...Cc6.',
    ],
    plans: {
      w: [
        'Cambiar o expulsar el caballo de d4 (4.Cxd4) y consolidar el centro con Cc3 y Ae3.',
        'En la variante Mieses (4...Cf6 5.Cxc6 bxc6 6.e5), fijar el centro y aprovechar la estructura superior de peones en un final.',
      ],
      b: [
        'Desarrollar activamente con 4...Ac5 (Variante Clásica) presionando d4, o 4...Cf6 atacando e4.',
        'Romper más adelante con ...d5 o ...f5 para liquidar el peón central blanco de e4/e5.',
      ],
    },
    structures: [
      'Estructura Mieses (peones blancos en e5/d2 o f4 contra peones negros doblados en c7/c6 y d5): lucha entre estructura blanca y actividad de alfiles negros.',
      'Centro semiabierto con peón blanco en e4 y columna d abierta.',
    ],
    keySquares: [
      { square: 'd4', role: 'Casilla central donde se produce el choque inicial y se instala el caballo blanco.' },
      { square: 'e5', role: 'Casilla de avance del peón blanco en la variante 4...Cf6 5.Cxc6 bxc6 6.e5.' },
      { square: 'c5', role: 'Casilla ideal del alfil negro en la Variante Clásica para atacar el caballo de d4.' },
      { square: 'e6', role: 'Casilla desde la que el alfil o caballo negro bloquea o presiona el centro.' },
    ],
    development: [
      { piece: 'Caballo de f3', idea: 'Recaptura en d4 y domina el centro (o se cambia en c6).' },
      { piece: 'Alfil de c1', idea: 'Sale rápidamente a e3 para sostener el caballo de d4, o a f4/g5.' },
      { piece: 'Alfil de f1', idea: 'Se coloca en c4, e2 o d3 según la respuesta negra.' },
      { piece: 'Caballo de b1', idea: 'Se desarrolla a c3 o d2 para sostener e4.' },
    ],
    commonMistakes: [
      'Con negras, rehusar la captura 3...exd4: jugadas como 3...d6 permiten 4.dxe5 con clara ventaja blanca.',
      'Con blancas, tras 4.Cxd4 Ac5, jugar 5.Cc3? permitiendo 5...Axd4! 6.Dxd4 Cxd4 y perdiendo una pieza o el peón de e4.',
    ],
    traps: [
      {
        id: 'escocesa-trampa-dh4',
        name: 'Castigo a 4...Dh4?! con 5.Cc3 y Cb5',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nc3 Bb4 Be2 Qxe4 Nb5 Bxc3+ bxc3 Kd8 O-O',
        victim: 'b',
        mistakePly: 8,
        explanation:
          'En la antigua variante Steinitz 4...Dh4?!, si las negras se lanzan a comer el peón central con 6...Dxe4? (tras 5.Cc3 Ab4 6.Ae2), 7.Cb5! ataca simultáneamente el punto c7 y el alfil de b4, obligando al rey negro a perder el enroque con 8...Rd8.',
      },
    ],
    famousGames: [
      {
        white: 'Garry Kasparov',
        black: 'Anatoly Karpov',
        event: 'Campeonato del Mundo (Lyon, partida 16)',
        year: 1990,
        result: '1-0',
        note: 'Partida épica de más de cien jugadas que devolvió la Apertura Escocesa a la élite mundial.',
      },
    ],
    lines: [
      {
        id: 'escocesa-principal',
        name: 'Variante Clásica (4...Ac5 5.Ae3 Df6)',
        kind: 'principal',
        eco: 'C45',
        idea: 'Las negras presionan el caballo central de d4 con alfil y dama mientras las blancas refuerzan el punto con c3.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2',
        notes: {
          1: 'Ocupa el centro con e4 y prepara la apertura inmediata de líneas. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          2: 'Las negras responden simétricamente en el centro con e5, impidiendo d4 sin preparación y abriendo la diagonal de su alfil de f8.',
          3: 'Desarrolla el caballo del flanco de rey a su casilla natural f3, atacando directamente el peón negro de e5 y controlando d4.',
          4: 'Desarrolla el caballo de dama a c6 para defender el peón central de e5 y reforzar el control sobre la casilla d4.',
          5: [
            'La jugada definitoria de la Apertura Escocesa: las blancas abren el centro de inmediato sin la preparación lenta de c3.',
            'Desafía el peón negro de e5 y libera el alfil de c1 y la dama desde el tercer movimiento.',
            '3.Ab5 es la Española y 3.Ac4 es la Italiana.',
          ],
          6: [
            'Única respuesta correcta: las negras deben eliminar el peón de d4 para no ceder el centro.',
            'Abre la columna d y obliga al caballo blanco a acudir a d4.',
            '3...d6?! cede espacio tras 4.dxe5 dxe5 5.Dxd8+ Cxd8.',
          ],
          7: [
            'El caballo recaptura en d4 centralizándose y amenazando doblar peones en c6.',
            'Las blancas tienen un peón central en e4 contra ninguno de las negras en la cuarta/quinta fila.',
            '4.Ac4 es el Gambito Escocés, entregando el peón por rápido desarrollo.',
          ],
          8: [
            'Variante Clásica: el alfil negro sale a c5 atacando inmediatamente el caballo centralizado de d4.',
            'Suma dos atacantes (c6 y c5) sobre d4 y exige una respuesta precisa de las blancas.',
            '4...Cf6 es la otra gran rama principal (Variante Schmidt / Mieses).',
          ],
          9: [
            'Desarrolla el alfil a e3 defendiendo el caballo de d4 y oponiéndose en la diagonal al alfil negro de c5.',
            'Además prepara una posible descubierta si el caballo de d4 se mueve.',
            '5.Cxc6 Df6! amenaza mate en f2 antes de recapturar en c6 (línea de Paulsen, jugable pero requiere conocer teoría).',
          ],
          10: [
            'La dama negra sale a f6 para sumar un tercer atacante sobre la casilla d4 y evitar 6.Cxc6.',
            'Evita también que el caballo de d4 se mueva por la presión sobre e3 y b2.',
            '5...Ab6? sería un grave error táctico por 6.Cxc6 bxc6 7.Axb6 seguido de Dd4.',
          ],
          11: [
            'El peón de c2 avanza a c3 para sostener férreamente el caballo de d4 con tres defensores.',
            'Consolida el centro blanco y prepara el desarrollo del alfil de f1 y el caballo de b1 por a3 o d2.',
            '6.Cb5?! Axb3 7.fxe3 Dh4+ da buen juego a las negras.',
          ],
          12: [
            'El caballo de g8 se desarrolla por e7 (porque la dama ocupa f6) preparando el enroque corto y el golpe ...d5.',
            'Completa el desarrollo del flanco de rey negro.',
            '6...d6 también es posible, aunque más pasiva.',
          ],
          13: 'Las blancas desarrollan su alfil a c4 controlando d5 y despejando la primera fila para enrocar.',
          14: 'El caballo negro salta a e5 ganando tiempo sobre el alfil blanco de c4 y habilitando ...d5 o ...Dg6.',
          15: 'El alfil retrocede a e2 (evitando ...Cxc4) y las blancas están listas para enrocar corto con un centro sólido.',
        },
      },
      {
        id: 'escocesa-mieses',
        name: 'Variante Mieses (4...Cf6 5.Cxc6 bxc6 6.e5)',
        kind: 'secundaria',
        eco: 'C45',
        idea: 'La línea favorita de Kasparov: doblar los peones negros y ganar espacio con 6.e5.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6',
        notes: {
          8: [
            'Variante Schmidt/Mieses: las negras desarrollan el caballo a f6 atacando el peón central de e4.',
            'Obliga a las blancas a decidir entre defender e4 con 5.Cc3 o cambiar en c6.',
            '4...Ac5 es la Variante Clásica.',
          ],
          9: 'Las blancas cambian en c6 para estropear la estructura de peones negra antes de avanzar e5.',
          10: 'Las negras recapturan hacia el centro con ...bxc6 para poder apoyar luego la ruptura ...d5.',
          11: 'Avance temático: gana espacio y expulsa al caballo de f6, que tras 6...De7 7.De2 irá a d5.',
        },
      },
      {
        id: 'escocesa-cuatro-caballos',
        name: 'Escocesa de los Cuatro Caballos (4...Cf6 5.Cc3)',
        kind: 'secundaria',
        eco: 'C47',
        idea: 'Defender e4 con 5.Cc3 entrando en una posición abierta de desarrollo rápido y simétrico.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5',
        notes: {
          9: 'En lugar de cambiar en c6 de inmediato, las blancas defienden e4 desarrollando el caballo a c3.',
          10: 'Las negras clavan el caballo con ...Ab4 renovando la amenaza sobre e4. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
        },
      },
    ],
  },
  {
    id: 'dos-caballos',
    name: 'Defensa de los Dos Caballos',
    short: 'Dos Caballos',
    eco: 'C57',
    category: 'abiertas',
    side: 'b',
    studyAs: 'b',
    level: 'intermedio',
    popularity: 5,
    frequency: 'La respuesta más dinámica de las negras ante 3.Ac4; favorita de jugadores tácticos.',
    history:
      'Mencionada ya por Polerio en el siglo XVI y analizada a fondo por Carl Theodor von Bilguer en 1839, la Defensa de los Dos Caballos representa el espíritu del contraataque: en vez de copiar con 3...Ac5, las negras atacan e4 con 3...Cf6 y aceptan entregar un peón tras 4.Cg5 d5 5.exd5 Ca5! a cambio de una tremenda iniciativa.',
    goals: [
      'Con negras: desarrollar el caballo a f6 atacando e4 y tomar la iniciativa antes de que las blancas construyan su centro.',
      'Si las blancas juegan 4.Cg5, sacrificar un peón con 4...d5 5.exd5 Ca5! para ganar tiempos sobre el alfil de c4 y las piezas blancas descoordinadas.',
      'Con blancas: elegir entre la complicación táctica 4.Cg5 o el juego posicional sólido con 4.d3.',
    ],
    plans: {
      w: [
        'En la línea 4.Cg5 d5 5.exd5 Ca5 6.Ab5+, consolidar el peón extra devolviendo material cuando sea necesario para completar el desarrollo.',
        'Con 4.d3, entrar en estructuras tipo Italiana moderna donde el caballo negro ya está comprometido en f6.',
      ],
      b: [
        'Contra 4.Cg5: jugar 4...d5 5.exd5 Ca5! (nunca 5...Cxd5?!) y acosar al caballo de g5 con ...h6 y al centro con ...e4.',
        'Contra 4.d4 exd4 5.O-O (Ataque Max Lange / Urusov): devolver el peón con ...d5 para abrir líneas.',
      ],
    },
    structures: [
      'Gambito Polerio (5...Ca5): las blancas tienen un peón doblado extra en d5/c3 pero las negras dominan las diagonales y el desarrollo.',
      'Estructura tranquila con 4.d3: similar al Giuoco Pianissimo.',
    ],
    keySquares: [
      { square: 'f7', role: 'Objetivo del ataque blanco con 4.Cg5 que obliga al contragolpe ...d5.' },
      { square: 'd5', role: 'Casilla donde el peón negro intercepta la diagonal del alfil de c4.' },
      { square: 'a5', role: 'Casilla clave desde la que el caballo negro expulsa al alfil blanco de c4.' },
      { square: 'e4', role: 'Casilla central que las negras ocupan o presionan con su peón y caballo.' },
    ],
    development: [
      { piece: 'Caballo de g8', idea: 'Sale a f6 en la jugada 3 presionando e4 y provocando decisiones tempranas.' },
      { piece: 'Alfil de f8', idea: 'Sale a c5 o d6 apuntando hacia el flanco de rey blanco.' },
      { piece: 'Caballo de c6', idea: 'En la variante 4.Cg5 va a a5 para desalojar al alfil de c4.' },
    ],
    commonMistakes: [
      'Con negras: jugar 5...Cxd5?! tras 4.Cg5 d5 5.exd5, permitiendo el demoledor Ataque Fegatello (6.Cxf7! o 6.Df3!).',
      'Con blancas: aferrarse al peón extra tras 5...Ca5 olvidando desarrollar el flanco de dama.',
    ],
    traps: [
      {
        id: 'dos-caballos-fegatello',
        name: 'Ataque Fegatello (Hígado Frito): 5...Cxd5?! 6.Cxf7!',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4 Qe4',
        victim: 'b',
        mistakePly: 10,
        explanation:
          'Si las negras recapturan en d5 con el caballo (5...Cxd5?! en vez de 5...Ca5!), 6.Cxf7! Rxf7 7.Df3+ Re6 8.Cc3 extrae al rey negro al centro del tablero bajo un fuego cruzado sobre el caballo clavado de d5.',
      },
    ],
    famousGames: [
      {
        white: 'Paul Morphy',
        black: 'Amateur (consulta)',
        event: 'Nueva Orleans',
        year: 1858,
        result: '1-0',
        note: 'Exhibición clásica de ataque sobre f7 y las líneas abiertas en la Defensa de los Dos Caballos.',
      },
    ],
    lines: [
      {
        id: 'dos-caballos-principal',
        name: 'Defensa Polerio (4.Cg5 d5 5.exd5 Ca5!)',
        kind: 'principal',
        eco: 'C58',
        idea: 'Refutar el ataque directo sobre f7 mediante la intercepción ...d5 y el salto ...Ca5.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4',
        notes: {
          1: 'Ocupa el centro con el peón de rey, controla d5 y f5 y despeja la diagonal f1-a6 para desarrollar el alfil.',
          2: 'Las negras colocan su peón en e5 para igualar el espacio central, controlar d4 y f4 y liberar su alfil de rey.',
          3: 'Desarrolla el caballo a la casilla activa f3, atacando el peón central negro de e5 y preparando el rápido enroque corto.',
          4: 'Desarrolla el caballo de dama a c6 para defender el peón central de e5 y reforzar el control sobre la casilla d4.',
          5: 'Desarrolla el alfil de f1 a la diagonal activa a2-g8 apuntando directamente al punto f7 y despejando el enroque corto.',
          6: [
            'Defensa de los Dos Caballos: en lugar de 3...Ac5, las negras desarrollan el caballo a f6 contraatacando el peón de e4.',
            'Invita a las blancas a atacar f7 con 4.Cg5 sabiendo que las negras disponen de un potente contrajuego.',
            '3...Ac5 es la Apertura Italiana clásica.',
          ],
          7: [
            'Las blancas aceptan el guante: unen caballo y alfil contra el punto f7, que no puede defenderse con una pieza.',
            'Aunque mueve dos veces la misma pieza en la apertura, crea una amenaza concreta de horquilla en f7.',
            '4.d3 es la alternativa posicional preferida por muchos Grandes Maestros modernos.',
          ],
          8: [
            'Única jugada para interceptar la diagonal del alfil blanco de c4 hacia f7.',
            'Las negras entregan un peón central para abrir líneas y ganar tiempos de desarrollo.',
            'Cualquier otra jugada pierde material en f7.',
          ],
          9: [
            'Las blancas capturan en d5 manteniendo el ataque sobre el caballo de c6 y renovando la presión.',
            'La columna e se abre y las negras deben elegir cómo continuar.',
            '5.Axd5 Cxd5 permite a las negras recuperar la pieza con excelente juego.',
          ],
          10: [
            '¡La jugada clave de Polerio (5...Ca5!)! En vez de recapturar en d5, las negras atacan el alfil blanco de c4, el cómplice del ataque sobre f7.',
            'Evita el Ataque Fegatello (5...Cxd5?! 6.Cxf7!) y garantiza a las negras una fuerte iniciativa por el peón sacrificado.',
            '5...Cd4 (Variante Fritz) y 5...b5 (Variante Ulvestad) son secundarias peligrosas.',
          ],
          11: [
            'Las blancas dan jaque en b5 para conservar su alfil activo y obligar a las negras a definir la casilla c6.',
            'Es la continuación principal para mantener el equilibrio.',
            '6.d3 h6 7.Cf3 e4 deja a las blancas en una posición pasiva.',
          ],
          12: [
            'Las negras cubren el jaque con ...c6 ofreciendo el peón para abrir la columna b y acelerar su desarrollo.',
            'Ganar tiempos sobre los alfiles y el caballo blanco vale mucho más que un peón doblado.',
            '6...Ad7 permite 7.De2 manteniendo el peón con menos contrajuego negro.',
          ],
          13: 'Las blancas aceptan el peón para obligar a las negras a recapturar y poder retirar su alfil.',
          14: 'Recaptura con ganancia de tiempo sobre el alfil blanco de b5 y abre las diagonales para el alfil de c8 y la dama.',
          15: 'El alfil retrocede a e2 (6...bxc6 7.Ae2) para controlar la casilla g4 y dar salida al caballo de g5.',
          16: 'Las negras expulsan por fin al caballo intruso de g5 ganando otro tiempo.',
          17: 'El caballo vuelve a f3, pero ahora se encontrará con el avance del peón negro.',
          18: 'El peón negro avanza a e4 atacando el caballo de f3 (que deberá ir a e5): las negras tienen gran actividad de piezas como compensación por el peón.',
        },
      },
      {
        id: 'dos-caballos-moderna-d3',
        name: 'Variante Moderna (4.d3 Ac5)',
        kind: 'secundaria',
        eco: 'C55',
        idea: 'Evitar las complicaciones de 4.Cg5 manteniendo una posición sólida tipo Italiana.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1 a6',
        notes: {
          7: [
            'En lugar de 4.Cg5, las blancas sostienen e4 tranquilamente con 4.d3. Establece una base firme para desarrollar las piezas y disputar el control central.',
            'Transpone a menudo al Giuoco Pianissimo si las negras juegan 4...Ac5, o permite atacar el alfil si juegan 4...Ae7.',
            '4.Cg5 es la línea crítica táctica.',
          ],
          8: 'Las negras desarrollan el alfil a su diagonal más activa c5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
        },
      },
      {
        id: 'dos-caballos-fegatello-linea',
        name: 'Ataque Fegatello / Lolli (5...Cxd5?! 6.Cxf7 / 6.d4)',
        kind: 'trampa',
        eco: 'C57',
        idea: 'Castigo directo si las negras capturan erróneamente en d5 con el caballo.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4',
        notes: {
          10: '5...Cxd5?! es la jugada que permite el sacrificio en f7; en la práctica de club aparece constantemente.',
          11: '6.Cxf7! obliga al rey negro a salir a f7 y tras 7.Df3+ Re6 las blancas atacan con todas sus piezas.',
        },
      },
    ],
  },
  {
    id: 'petrov',
    name: 'Defensa Petrov (Defensa Rusa)',
    short: 'Petrov',
    eco: 'C42',
    category: 'abiertas',
    side: 'b',
    studyAs: 'b',
    level: 'intermedio',
    popularity: 4,
    frequency: 'Una de las defensas más sólidas de la élite; empleada por Fabiano Caruana, Kramnik y Karpov.',
    history:
      'Bautizada en honor a los maestros rusos Alexander Petrov y Carl Jaenisch, que la analizaron exhaustivamente en la década de 1840 como alternativa a 2...Cc6. Conocida por su extraordinaria solidez y simetría controlada, evita la Española, la Italiana y la Escocesa desde la segunda jugada.',
    goals: [
      'Contraatacar inmediatamente el peón blanco de e4 con 2...Cf6 en vez de defender pasivamente e5.',
      'Advertencia crítica: tras 3.Cxe5, jugar SIEMPRE 3...d6! antes de capturar en e4 para no caer en la trampa de 3...Cxe4? 4.De2.',
      'Neutralizar la iniciativa blanca cambiando un par de peones centrales y desarrollando sin debilidades.',
    ],
    plans: {
      w: [
        'Instalar un puesto avanzado con 5.d4 y 6.Ad3 seguido de c4, o enrocar largo con 5.Cc3 (variante moderna Nimzowitsch).',
        'Aprovechar la ligera ventaja de tiempos en la columna e abierta.',
      ],
      b: [
        'Jugar 3...d6 4.Cf3 Cxe4, sostener o retirar el caballo con ...d5 y ...Ae7 y golpear la base del centro blanco con ...c5.',
        'Cambiar piezas menores para aliviar la presión sobre el enroque.',
      ],
    },
    structures: [
      'Estructura simétrica sin peones e (peones en d4 y d5): las blancas tienen el turno extra pero ninguna debilidad que explotar fácil.',
      'Ataque con enroques opuestos en la línea 5.Cc3 Cxc3 6.dxc3.',
    ],
    keySquares: [
      { square: 'e4', role: 'Peón blanco atacado en la jugada 2 y casilla avanzada del caballo negro.' },
      { square: 'e5', role: 'Peón negro capturado temporalmente y casilla fuerte para el caballo blanco.' },
      { square: 'd6', role: 'Jugada intermedia indispensable (3...d6!) para expulsar el caballo antes de recuperar en e4.' },
    ],
    development: [
      { piece: 'Caballo de g8', idea: 'Sale a f6 en la jugada 2 contraatacando e4.' },
      { piece: 'Alfil de f8', idea: 'Va a e7 (o d6) para cubrir la columna e y permitir el enroque rápido.' },
      { piece: 'Caballo de b8', idea: 'Se desarrolla a c6 o d7 para apoyar ...c5.' },
    ],
    commonMistakes: [
      'Con negras: copiar con 3...Cxe4? tras 3.Cxe5: tras 4.De2! si el caballo se retira (4...Cf6??) sigue 5.Cc6+ ganando la dama por jaque descubierto.',
      'Dejar el caballo negro de e4 clavado en la columna e sin haber preparado ...d5 y ...Ae7.',
    ],
    traps: [
      {
        id: 'petrov-trampa-copia-dama',
        name: 'Celada de la copia: 3...Cxe4? 4.De2 Cf6?? 5.Cc6+!',
        moves: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6 Nc6+ Be7 Nxd8',
        victim: 'b',
        mistakePly: 8,
        explanation:
          'Si las negras copian 3...Cxe4? y ante 4.De2 retiran el caballo (4...Cf6??), 5.Cc6+! da jaque descubierto con la dama por la columna e y captura la dama negra de d8 en la jugada siguiente.',
      },
    ],
    famousGames: [
      {
        white: 'Fabiano Caruana',
        black: 'Magnus Carlsen',
        event: 'Campeonato del Mundo (Londres, partida 6)',
        year: 2018,
        result: '1/2-1/2',
        note: 'Batalla de altísima precisión en la Defensa Petrov durante el duelo mundial de 2018.',
      },
    ],
    lines: [
      {
        id: 'petrov-principal',
        name: 'Variante Clásica (3.Cxe5 d6 4.Cf3 Cxe4 5.d4 d5)',
        kind: 'principal',
        eco: 'C42',
        idea: 'Expulsar primero el caballo blanco con 3...d6! y recuperar el peón de e4 con plena seguridad.',
        moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4',
        notes: {
          1: 'Ocupa la casilla central e4, controla d5 y f5 y abre de inmediato las diagonales para la dama y el alfil de rey blanco.',
          2: 'Las negras responden simétricamente en el centro con e5, impidiendo d4 sin preparación y abriendo la diagonal de su alfil de f8.',
          3: 'El caballo blanco sale a f3 atacando directamente el peón negro de e5 y controlando la casilla central d4.',
          4: [
            'Defensa Petrov: las negras contraatacan el peón blanco de e4 en lugar de defender el suyo con 2...Cc6.',
            'Evita que las blancas elijan entre Española, Italiana o Escocesa y lleva el juego a terreno propio.',
            '2...Cc6 es la alternativa clásica más frecuente.',
          ],
          5: [
            'La prueba principal de la Petrov: las blancas capturan el peón central de e5.',
            'Obliga a las negras a demostrar cómo recuperan el peón sin caer en descubiertas por la columna e.',
            '3.d4 es el Ataque Steinitz (Moderno) y 3.Cc3 transpone a los Cuatro Caballos.',
          ],
          6: [
            '¡Jugada intermedia obligatoria (3...d6!)! Antes de capturar en e4, las negras expulsan al caballo blanco de e5.',
            'Evita la celada 3...Cxe4? 4.De2! donde las negras perderían al menos un peón.',
            '3...Cc6?! es el arriesgado Gambito Stafford.',
          ],
          7: [
            'El caballo blanco vuelve a su casilla natural f3 tras cumplir su misión de eliminar el peón de e5.',
            'Mantiene el desarrollo sano.',
            '4.Cxf7?! Rxf7 es el Gambito Cochrane, especulativo.',
          ],
          8: [
            'Ahora que el caballo blanco ya no está en e5, las negras recuperan el peón de e4 con total seguridad.',
            'Restablece la igualdad material con la columna e abierta.',
            'No hay otra continuación coherente.',
          ],
          9: [
            'Las blancas ocupan el centro con d4, impidiendo que el caballo negro se sostenga con ...d5 sin ser cuestionado y abriendo sus dos alfiles.',
            'Amenaza ganar tiempos sobre el caballo avanzado en e4 con Ad3 y Te1.',
            '5.Cc3 Cxc3 6.dxc3 conduce a rápidas partidas de enroques opuestos.',
          ],
          10: [
            'Las negras afianzan su presencia central con ...d5, sosteniendo temporalmente el caballo en e4 y dando espacio a sus alfiles.',
            'Fija el peón blanco en d4 para atacarlo más tarde.',
            '5...Ae7 pasivo permitiría 6.Ad3 d5 7.O-O con más comodidad blanca.',
          ],
          11: [
            'Desarrolla el alfil a d3 apuntando al caballo negro de e4 y al futuro enroque corto negro.',
            'Prepara el enroque corto y Te1.',
            '6.Ae2 es demasiado tímida.',
          ],
          12: [
            'Desarrolla el caballo de dama a c6 presionando el peón central blanco de d4.',
            'Coordina la defensa de e4 con el contraataque sobre d4.',
            '6...Ae7 también es muy común (orden Marshall).',
          ],
          13: 'Las blancas se enrocan y preparan Te1 y c4 para cuestionar el centro negro.',
          14: 'El alfil negro sale a e7 cubriendo la columna e y dejando listo el enroque corto.',
          15: 'Golpe temático blanco: ataca la base del sostén negro en d5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          16: 'Las negras saltan con ...Cb4 acosando al importante alfil blanco de d3 y aliviando la presión central.',
        },
      },
      {
        id: 'petrov-nimzowitsch-cc3',
        name: 'Variante Moderna / Nimzowitsch (5.Cc3 Cxc3 6.dxc3)',
        kind: 'secundaria',
        eco: 'C42',
        idea: 'Cambiar caballos en c3 para abrir líneas, desarrollar rápido con Ae3 y Dd2 y enrocar largo.',
        moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 O-O Qd2 Nd7 O-O-O',
        notes: {
          9: [
            'Propuesta por Nimzowitsch y empleada en la élite moderna: las blancas ofrecen doblar sus peones en c3 a cambio de un desarrollo fulgurante y enroque largo.',
            'Elimina de inmediato el activo caballo negro de e4.',
            '5.d4 es la línea clásica.',
          ],
          10: 'Las negras aceptan el cambio porque retirar el caballo perdería un tiempo valioso.',
          11: 'Recaptura con el peón de d abriendo la diagonal del alfil de c1 y la columna d para la dama y la torre.',
        },
      },
      {
        id: 'petrov-steinitz-3d4',
        name: 'Ataque Steinitz (3.d4 Cxe4 4.Ad3 d5)',
        kind: 'secundaria',
        eco: 'C43',
        idea: 'Atacar el centro negro con 3.d4 antes de capturar en e5.',
        moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6',
        notes: {
          5: 'Steinitz prefería 3.d4 para abrir el centro de inmediato y evitar la simetría de 3.Cxe5.',
          6: '3...Cxe4 (o 3...exd4 4.e5 Ce4) lleva a un juego abierto donde ambos bandos desarrollan con fluidez.',
        },
      },
    ],
  },
  {
    id: 'philidor',
    name: 'Defensa Philidor',
    short: 'Philidor',
    eco: 'C41',
    category: 'defensas',
    side: 'b',
    studyAs: 'b',
    level: 'basico',
    popularity: 3,
    frequency: 'Habitual en jugadores que buscan una estructura sólida de peones sin entrar en la Española.',
    history:
      'Lleva el nombre del músico y ajedrecista francés François-André Danican Philidor (1726–1795), autor del célebre aforismo «los peones son el alma del ajedrez». Aunque el plan original de Philidor con ...f5 inmediato resulta arriesgado, la versión moderna de Hanham (con ...Cf6, ...Cbd7 y ...Ae7) es una defensa resistente.',
    goals: [
      'Defender el peón de e5 con 2...d6 manteniendo la cadena de peones d6-e5 compacta.',
      'En la Variante Hanham, sostener el punto fuerte e5 con ...Cbd7 y ...Cf6, desarrollando el alfil por e7.',
      'Evitar encerrarse pasivamente ni permitir sacrificios en f7 por falta de desarrollo.',
    ],
    plans: {
      w: [
        'Abrir el centro con 3.d4 y aprovechar la ventaja de espacio y la diagonal a2-g8 con Ac4.',
        'Presionar f7 y e5 con Cg5, Te1 y De2.',
      ],
      b: [
        'Mantener el punto fuerte e5 (Variante Hanham: ...Cf6, ...Cbd7, ...Ae7, ...c6) o ceder el centro con ...exd4 jugando por las columnas d y e.',
        'Buscar contrajuego en el flanco de dama con ...c6, ...b5 y ...Dc7.',
      ],
    },
    structures: [
      'Cadena Hanham (peones negros en c6-d6-e5 frente a e4-d4): posición restringida pero sin debilidades fáciles.',
      'Centro abierto tras 3...exd4 4.Cxd4: las blancas tienen espacio y las negras presionan e4.',
    ],
    keySquares: [
      { square: 'e5', role: 'Baluarte central de las negras sostenido por el peón de d6.' },
      { square: 'f7', role: 'Punto sensible si las negras retrasan el desarrollo del flanco de rey.' },
      { square: 'd4', role: 'Casilla central donde las blancas ganan espacio en la jugada 3.' },
    ],
    development: [
      { piece: 'Caballo de g8', idea: 'Debe salir pronto a f6 para atacar e4 y vigilar d5.' },
      { piece: 'Caballo de b8', idea: 'Va a d7 (Variante Hanham) para apoyar e5 sin bloquear el peón c.' },
      { piece: 'Alfil de f8', idea: 'Queda limitado a e7 por el peón en d6 (o en fianchetto con ...g6).' },
    ],
    commonMistakes: [
      'Jugar 3...Ag4? clavando el caballo de f3 demasiado pronto y permitiendo el Mate de Légal o la pérdida de un peón tras 4.dxe5.',
      'Avanzar ...f5 con el rey aún en el centro.',
    ],
    traps: [
      {
        id: 'philidor-mate-legal',
        name: 'El Mate de Légal (sacrificio de dama tras ...Ag4 y ...g6??)',
        moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#',
        victim: 'b',
        mistakePly: 8,
        explanation:
          'La trampa más famosa de la historia del ajedrez (Sire de Légal, París 1750): tras 3.Ac4 Ag4?! 4.Cc3 g6??, la clavada es falsa. 5.Cxe5! entrega la dama, y si 5...Axd1 sigue mate forzado con 6.Axf7+ Re7 7.Cd5# (y si 5...dxe5 6.Dxg4 las blancas ganan un peón limpio).',
      },
    ],
    famousGames: [
      {
        white: 'Paul Morphy',
        black: 'Duque de Brunswick y Conde Isouard',
        event: 'Ópera de París',
        year: 1858,
        result: '1-0',
        note: 'La legendaria «Partida de la Ópera»: demostración inmortal de desarrollo rápido, sacrificio de piezas y mate en d8 con torre tras sacrificio de dama en b8.',
      },
    ],
    lines: [
      {
        id: 'philidor-principal',
        name: 'Variante Hanham (3.d4 Cf6 4.Cc3 Cbd7)',
        kind: 'principal',
        eco: 'C41',
        idea: 'Sostener el punto e5 con peón y caballos antes de desarrollar el alfil a e7 y enrocar.',
        moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 a5',
        notes: {
          1: 'Ocupa la casilla central e4, controla d5 y f5 y abre de inmediato las diagonales para la dama y el alfil de rey blanco.',
          2: 'Las negras fijan su peón central en e5, impidiendo que las blancas ocupen d4 y e4 a la vez sin preparación.',
          3: 'El caballo blanco se desarrolla a f3, desde donde presiona el peón central de e5 y vigila la casilla d4.',
          4: [
            'Defensa Philidor: las negras defienden e5 con el peón de d6. Establece una base firme para desarrollar las piezas y disputar el control central.',
            'Crea una cadena sólida d6-e5 a costa de limitar temporalmente la diagonal del alfil de f8.',
            '2...Cc6 y 2...Cf6 desarrollan una pieza sin encerrar el alfil.',
          ],
          5: [
            'Las blancas aprovechan de inmediato para ocupar todo el centro con 3.d4 y cuestionar e5.',
            'Abre las líneas para ambos alfiles blancos y gana espacio.',
            '3.Ac4 es jugable pero menos incisiva que 3.d4.',
          ],
          6: [
            'Las negras desarrollan el caballo a f6 contraatacando el peón blanco de e4 antes de definir el centro.',
            'Es el orden moderno más preciso para mantener e5 sin ceder la tensión.',
            '3...exd4 4.Cxd4 entra en la Variante del Cambio de la Philidor.',
          ],
          7: [
            'Desarrolla el caballo a c3 defendiendo el peón de e4 y manteniendo la tensión central.',
            '4.dxe5 Cxe4 5.Dd5 Cc5 lleva a un final igualado.',
            'Completa el desarrollo de ambos caballos blancos hacia el centro.',
          ],
          8: [
            'Variante Hanham: el caballo de b8 se desarrolla a d7 para sostener el peón de e5 sin bloquear el peón c.',
            'Cuidado: las negras aún deben tener presente la debilidad de f7 hasta jugar ...Ae7 y ...O-O.',
            '4...Ae7 antes de ...Cbd7 también es un orden seguro.',
          ],
          9: [
            'El alfil sale a la activa casilla c4 apuntando a f7 y controlando d5. Establece una base firme para desarrollar las piezas y disputar el control central.',
            'Obliga a las negras a jugar con cuidado (p. ej. 5...h6?? perdería tras 6.dxe5 dxe5 7.Axf7+!).',
            '5.g4!? (Ataque Shirov) es una alternativa ultraagresiva moderna.',
          ],
          10: [
            'Las negras desarrollan el alfil a e7 preparando el enroque corto y neutralizando las amenazas tácticas sobre f7.',
            '5...h6?? sería un error grave por el sacrificio en f7.',
            'Prepara la puesta en seguridad del rey negro.',
          ],
          11: 'Las blancas se enrocan corto y conectan sus piezas. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          12: 'Las negras completan el enroque: su posición es algo restringida pero muy difícil de romper.',
          13: 'La torre blanca ocupa la columna central e1 presionando indirectamente e5.',
          14: 'Las negras juegan ...c6 controlando d5 y preparando contrajuego con ...b5 o ...Dc7.',
          15: 'Las blancas juegan a4 para impedir la expansión negra ...b5 y asegurar una casilla en a2 para su alfil.',
          16: 'Las negras responden ...a5 fijando el flanco de dama y asegurando la casilla c5 para su caballo de d7.',
        },
      },
      {
        id: 'philidor-cambio',
        name: 'Variante del Cambio (3.d4 exd4 4.Cxd4)',
        kind: 'secundaria',
        eco: 'C41',
        idea: 'Ceder el punto e5 para evitar la falta de espacio de la estructura Hanham y presionar e4.',
        moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8',
        notes: {
          6: [
            'Las negras cambian en d4 abandonando el punto e5 pero abriendo la columna e para su torre tras el enroque.',
            'Posición muy sólida aunque pasiva para las negras.',
            '3...Cf6 mantiene el punto e5.',
          ],
          7: 'El caballo blanco se centraliza en d4 con clara ventaja de espacio. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
        },
      },
      {
        id: 'philidor-opera-bg4',
        name: 'Línea de la Ópera (3.d4 Bg4?! 4.dxe5)',
        kind: 'trampa',
        eco: 'C41',
        idea: 'Refutación clásica de 3...Ag4?! (Morphy vs Duque de Brunswick e Isouard, 1858).',
        moves: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3',
        notes: {
          6: '3...Ag4?! mueve el alfil antes que los caballos y pierde un peón o el desarrollo tras 4.dxe5!',
          7: '4.dxe5! obliga a las negras a cambiar su alfil por el caballo con 4...Axf3, tras lo cual 5.Dxf3 dxe5 6.Ac4 y 7.Db3 atacan simultáneamente f7 y b7.',
        },
      },
    ],
  },
  {
    id: 'vienesa',
    name: 'Apertura Vienesa',
    short: 'Vienesa',
    eco: 'C25',
    category: 'abiertas',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 3,
    frequency: 'Excelente arma sorpresa de club y torneo; combina solidez posicional con ideas de Gambito de Rey mejorado.',
    history:
      'Desarrollada en la escuela de Viena a mediados del siglo XIX por Carl Hamppe y perfeccionada por Wilhelm Steinitz y Rudolf Spielmann. Con 2.Cc3 las blancas retrasan Cf3 para reservarse la opción de avanzar el peón f (f4) con el centro ya protegido por el caballo de c3.',
    goals: [
      'Desarrollar primero el caballo de dama con 2.Cc3 protegiendo e4 y controlando d5.',
      'Mantener abierta la opción de lanzar f4 (Gambito Vienés) para abrir la columna f tras el enroque corto.',
      'En las variantes tranquilas con 3.Ac4 o 3.g3, presionar la casilla central d5.',
    ],
    plans: {
      w: [
        'Contra 2...Cf6: jugar 3.f4 d5! 4.fxe5 Cxe4 y luchar por el centro, o jugar 3.Ac4 permitiendo el truco 3...Cxe4 4.Dh5!',
        'Contra 2...Cc6: jugar 3.Ac4 o 3.g3 Ag2 construyendo un férreo control sobre d5.',
      ],
      b: [
        'Responder a 3.f4 con el contragolpe central exacto 3...d5! (nunca 3...exf4?!).',
        'Contra 3.Ac4 Cf6, usar el golpe temático 3...Cxe4! 4.Dh5 Cd6 igualando si se conoce la continuación.',
      ],
    },
    structures: [
      'Estructura con columna f semiabierta tras f4 y ...d5: juego abierto y táctico en ambos flancos.',
      'Esquema cerrado con g3, Ag2 y d3 controlando d5.',
    ],
    keySquares: [
      { square: 'd5', role: 'Casilla central controlada por 2.Cc3 y punto del contragolpe negro ...d5!' },
      { square: 'f4', role: 'Avance temático del peón blanco que distingue a la Vienesa de 2.Cf3.' },
      { square: 'f7', role: 'Objetivo en la columna f semiabierta y en la diagonal a2-g8.' },
    ],
    development: [
      { piece: 'Caballo de b1', idea: 'Sale en la jugada 2 a c3 defendiendo e4 y vigilando d5.' },
      { piece: 'Alfil de f1', idea: 'Va a c4 (apuntando a f7) o a g2 en la variante de fianchetto.' },
      { piece: 'Caballo de g1', idea: 'Espera detrás del peón f para permitir f4 antes de salir a f3 (o e2).' },
    ],
    commonMistakes: [
      'Con negras: aceptar 3.f4 exf4?! tras 2...Cf6, lo que permite 4.e5! expulsando al caballo de f6 hacia g8.',
      'Con negras: en 2.Cc3 Cf6 3.Ac4 Cxe4 4.Dh5, defender f7 con 4...Cf6?? recibiendo 5.Dxf7#.',
    ],
    traps: [
      {
        id: 'vienesa-trampa-aceptar-f4',
        name: 'Error 3...exf4?! en el Gambito Vienés (4.e5 Cg8!)',
        moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Qe7 Qe2 Ng8 Nf3',
        victim: 'b',
        mistakePly: 6,
        explanation:
          'Si tras 1.e4 e5 2.Cc3 Cf6 3.f4 las negras capturan como en el Gambito de Rey (3...exf4?! en vez de 3...d5!), el caballo blanco en c3 impide ...Dh4+ y 4.e5! obliga al caballo negro a regresar humillantemente a su casilla inicial g8.',
      },
    ],
    famousGames: [
      {
        white: 'Wilhelm Steinitz',
        black: 'Joseph Henry Blackburne',
        event: 'Londres',
        year: 1876,
        result: '1-0',
        note: 'Steinitz empleó la Apertura Vienesa como una de sus armas predilectas para demostrar el dominio posicional del centro.',
      },
    ],
    lines: [
      {
        id: 'vienesa-principal',
        name: 'Gambito Vienés con 3...d5! (2.Cc3 Cf6 3.f4 d5)',
        kind: 'principal',
        eco: 'C29',
        idea: 'Lucha central directa entre el avance blanco 3.f4 y el contragolpe negro 3...d5!',
        moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3 c5',
        notes: {
          1: 'Ocupa la casilla central e4, controla d5 y f5 y abre de inmediato las diagonales para la dama y el alfil de rey blanco.',
          2: 'Las negras responden simétricamente en el centro con e5, impidiendo d4 sin preparación y abriendo la diagonal de su alfil de f8.',
          3: [
            'Apertura Vienesa: las blancas desarrollan primero el caballo de dama a c3 defendiendo e4 y controlando d5.',
            'Al no jugar todavía Cf3, conservan libre el peón f para lanzar el avance f4 en condiciones favorables.',
            '2.Cf3 es la jugada más común de las aperturas abiertas.',
          ],
          4: [
            'La respuesta más activa de las negras: desarrollan el caballo a f6 preparando el contragolpe central ...d5.',
            '2...Cc6 es más tranquila pero permite a las blancas dictar el carácter de la posición con 3.Ac4 o 3.f4.',
            'Controla d5 y e4.',
          ],
          5: [
            'El Gambito Vienés: las blancas atacan el peón central negro de e5 con el peón f.',
            'Si las negras capturasen en f4 perderían el centro tras 4.e5; por eso deben contragolpear de inmediato.',
            '3.Ac4 y 3.g3 son las alternativas posicionales.',
          ],
          6: [
            '¡Única respuesta que iguala (3...d5!)! Las negras golpean el centro en vez de capturar en f4.',
            'Si 3...exf4?! 4.e5! el caballo de f6 no tiene casillas buenas y tiene que volver a g8.',
            'Abre la diagonal para el alfil de c8 y cuestiona e4.',
          ],
          7: [
            'Las blancas capturan en e5 atacando el caballo de f6. Establece una base firme para desarrollar las piezas y disputar el control central.',
            '4.exd5 e4 también es jugable pero 4.fxe5 es la línea principal.',
            'Abre la columna f para la futura torre enrocada.',
          ],
          8: [
            'El caballo negro salta al centro capturando el peón de e4 y presionando el caballo de c3.',
            'Se restablece el equilibrio material con un caballo negro muy activo en e4.',
            'No hay otra casilla activa para el caballo.',
          ],
          9: [
            'Desarrolla el caballo a f3 controlando d4 y preparando Ad3 y el enroque corto.',
            '4...Cxe4 5.Df3 (Variante Paulsen) o 5.d3 también son líneas muy utilizadas.',
            'Evita incursiones de la dama negra en h4.',
          ],
          10: [
            'Las negras desarrollan el alfil a e7 preparando el enroque corto y vigilando la casilla g5.',
            '5...Ag4 o 5...Ac5 también son continuaciones principales.',
            'Pone a cubierto a su rey antes de abrir más el centro.',
          ],
          11: [
            'Las blancas consolidan el centro con d4 y abren la diagonal para el alfil de c1.',
            'Ahora amenazan expulsar o cambiar el caballo negro de e4 con Ad3.',
            'Fija un fuerte centro de peones.',
          ],
          12: 'Las negras se enrocan corto completando la seguridad de su rey. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          13: 'El alfil blanco sale a d3 atacando el caballo centralizado de e4 y apuntando a h7.',
          14: 'Las negras cambian en c3 antes de ser expulsadas para dejar peones doblados en la columna c.',
          15: 'Recaptura hacia el centro: las blancas obtienen una fuerte masa de peones centrales y la columna b abierta.',
          16: 'Contragolpe temático negro: ataca la base de la cadena blanca en d4 antes de que las blancas lancen su ataque en el flanco de rey.',
        },
      },
      {
        id: 'vienesa-hamppe-bc4',
        name: 'Variante Mieses / Frankenstein-Drácula (3.Ac4 Cxe4 4.Dh5)',
        kind: 'secundaria',
        eco: 'C27',
        idea: 'Truco táctico 3...Cxe4 seguido del ataque directo 4.Dh5 sobre f7 y e4.',
        moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8',
        notes: {
          5: '3.Ac4 apunta a f7 y parece dejar desprotegido el peón de e4, invitando a la captura.',
          6: '3...Cxe4! es el truco temático: si 4.Cxe4 sigue 4...d5! recuperando la pieza con buen centro.',
          7: '4.Dh5! ataca mate en f7 y el caballo de e4, obligando a 4...Cd6 5.Ab3, origen de la salvaje variante Frankenstein-Drácula.',
        },
      },
      {
        id: 'vienesa-fianchetto-g3',
        name: 'Sistema Posicional Mieses (2...Cc6 3.g3)',
        kind: 'secundaria',
        eco: 'C25',
        idea: 'Fianchettar el alfil en g2 para ejercer un control posicional absoluto sobre d5 y e4.',
        moves: 'e4 e5 Nc3 Nc6 g3 Bc5 Bg2 d6 Nge2 Nf6 d3 a6 O-O',
        notes: {
          5: 'Con 3.g3 y 4.Ag2 las blancas refuerzan el control de d5 y preparan Ce2 y f4 en una versión cerrada tipo Siciliana Cerrada con colores cambiados.',
          6: 'Las negras desarrollan el alfil a su casilla más activa c5 vigilando d4.',
        },
      },
    ],
  },
];
