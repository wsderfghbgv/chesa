import type { OpeningDef } from '../types';

export const FLANK_OPENINGS: OpeningDef[] = [
  {
    id: 'inglesa',
    name: 'Apertura Inglesa',
    short: 'Inglesa',
    eco: 'A29',
    category: 'flanco',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 5,
    frequency: 'Una de las cuatro grandes aperturas iniciales del ajedrez; favorita de Botvinnik, Korchnoi, Karpov y Kasparov.',
    history:
      'Bautizada así por Howard Staunton, quien la empleó en su match de 1843 contra Saint-Amant y en el Torneo Internacional de Londres de 1851. En el siglo XX Mikhail Botvinnik, Tigran Petrosian, Anatoly Karpov y Garry Kasparov (quien la usó para coronarse en Sevilla 1987) la convirtieron en un arma estratégica formidable.',
    goals: [
      'Luchar por la casilla central d5 desde el primer movimiento con el peón de flanco 1.c4 (una Defensa Siciliana con colores invertidos y un tiempo de más).',
      'Combinar la presión del peón de c4 con el fianchetto del alfil de rey en g2 (g3 y Ag2) y el caballo en c3 para dominar la casilla blanca d5.',
      'Mantener flexibilidad para romper con d4, f4 o b4 según el esquema que adopten las negras.',
    ],
    plans: {
      w: [
        'Contra 1...e5 (Siciliana Invertida): fianchettar el alfil en g2, jugar Cc3, Cf3, O-O, d3 (o d4) y expandir el flanco de dama con Tb1 y b4-b5.',
        'Sistema Botvinnik (c4, e4, Cc3, g3, Ag2, d3 y Cge2): preparar f4 o d4 manteniendo un control férreo de d5.',
      ],
      b: [
        'Inglesa Invertida (1...e5): desarrollar ...Cf6, ...Cc6 y ...Ac5 (o ...Ab4) presionando d4, o romper en el centro con ...d5.',
        'Inglesa Simétrica (1...c5): igualar la lucha en el flanco de dama o preparar el Sistema Erizo (...b6, ...d6, ...e6, ...a6).',
      ],
    },
    structures: [
      'Estructura Dragón Invertido (peones blancos en c4, d3 y g3 frente a peón negro en e5): las blancas presionan por la gran diagonal h1-a8 y el flanco de dama.',
      'Estructura Botvinnik (peones blancos en c4 y e4 con agujero en d4 compensado por el dominio de d5).',
    ],
    keySquares: [
      { square: 'd5', role: 'La casilla central clave que las blancas controlan con c4, Cc3 y Ag2.' },
      { square: 'd4', role: 'Casilla que las negras vigilan con ...e5, ...Cc6 y ...Ac5, o donde las blancas rompen con d4.' },
      { square: 'g2', role: 'Casilla del alfil blanco que multiplica la presión sobre d5 y b7.' },
      { square: 'b5', role: 'Avance de minorías blanco en el flanco de dama (Tb1 y b4-b5).' },
    ],
    development: [
      { piece: 'Alfil de f1', idea: 'Se fianchetta en g2 en la mayoría de las líneas de la Inglesa.' },
      { piece: 'Caballo de b1', idea: 'Sale temprano a c3 reforzando el control de d5 y e4.' },
      { piece: 'Caballo de g1', idea: 'Sale a f3 (o a e2 en el Sistema Botvinnik para no tapar al alfil de g2 ni al peón f).' },
      { piece: 'Torre de a1', idea: 'Va a b1 para apoyar el avance b4-b5 fuera de la diagonal del alfil de g2.' },
    ],
    commonMistakes: [
      'Con blancas: jugar d3 y e4 sin vigilar que un caballo negro se instale permanentemente en el agujero de d4.',
      'Con negras: permitir que el alfil blanco de g2 y el avance b4-b5 destruyan el flanco de dama sin contrajuego central.',
    ],
    traps: [
      {
        id: 'inglesa-trampa-d4-descubierta',
        name: 'Celada táctica en la Cuatro Caballos (4.g3 Ab4 5.Ag2 O-O 6.O-O e4 7.Cg5 Axc3 8.bxc3 Te8 9.f3 exf3? 10.Cxf3)',
        moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nxc3 bxc3 e4 Ng1',
        victim: 'w',
        mistakePly: 11,
        explanation:
          'En la línea abierta 4.g3 d5 5.cxd5 Cxd5 6.Ag2, si las negras omiten 6...Cb6! y en cambio las blancas capturan un peón en e5 (si 6...Ae6? 7.Cxe5! Cxe5 8.Da4+ recupera la pieza), o a la inversa si tras 6...Cxc3 7.bxc3 las negras avanzan 7...e4! el caballo blanco debe volver a g1.',
      },
    ],
    famousGames: [
      {
        white: 'Garry Kasparov',
        black: 'Anatoly Karpov',
        event: 'Campeonato del Mundo (Sevilla, partida 24)',
        year: 1987,
        result: '1-0',
        note: 'La histórica partida final del match de Sevilla: Kasparov necesitaba ganar a toda costa y eligió la Apertura Inglesa para retener la corona mundial.',
      },
    ],
    lines: [
      {
        id: 'inglesa-principal',
        name: 'Variante de los Cuatro Caballos con Fianchetto (1.c4 e5 2.Cc3 Cf6 3.Cf3 Cc6 4.g3)',
        kind: 'principal',
        eco: 'A29',
        idea: 'Las blancas dominan d5 con c4, Cc3 y Ag2 mientras las negras presionan el centro con ...Ab4 o ...d5.',
        moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 Bb4 Bg2 O-O O-O e4 Ng5 Bxc3 bxc3 Re8',
        notes: {
          1: [
            '¡La Apertura Inglesa (1.c4)! Las blancas luchan por la casilla central d5 con su peón lateral sin definir todavía sus peones de rey y dama.',
            'Ofrece enorme riqueza estratégica y evita las líneas forzadas tempranas de 1.e4 y 1.d4.',
            'Puede transponer al Gambito de Dama o permanecer en esquemas puros de flanco.',
          ],
          2: [
            'Siciliana Invertida (1...e5): las negras ocupan el centro y luchan por d4.',
            'Es como jugar una Defensa Siciliana donde las blancas tienen un tiempo de ventaja.',
            '1...c5 (Simétrica), 1...Cf6 y 1...e6 son las otras grandes respuestas.',
          ],
          3: 'Desarrolla el caballo a c3 sumando un segundo control sobre la casilla blanca d5.',
          4: 'Desarrolla el caballo a f6 controlando d5 y e4. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          5: [
            '3.Cf3 invita a la Variante de los Cuatro Caballos y controla d4 y e5. Establece una base firme para desarrollar las piezas y disputar el control central.',
            '3.g3 directo permite a las negras jugar 3...d5 4.cxd5 Cxd5 con el caballo blanco aún en g1.',
            'Orden preciso de Kasparov y Korchnoi.',
          ],
          6: 'Completa los Cuatro Caballos defendiendo el peón de e5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          7: [
            'Prepara el fianchetto del alfil de rey en g2 para dominar la gran diagonal h1-a8.',
            '4.e3 y 4.a3 son las alternativas principales sin fianchetto.',
            'Establece el sello de la Inglesa.',
          ],
          8: [
            'Variante 4...Ab4: las negras clavan el caballo de c3 preparando enrocar rápido y avanzar ...e4.',
            '4...d5 (Abierta) y 4...Ac5 son las otras dos líneas principales.',
            'Activa el alfil antes de que las blancas jueguen Cd5.',
          ],
          9: 'El alfil blanco ocupa la gran diagonal en g2. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          10: 'Las negras realizan el enroque corto para resguardar a su rey y traer la torre de f8 hacia las columnas centrales.',
          11: 'Las blancas completan el enroque corto, poniendo a su rey en seguridad y conectando la torre de f1 con el centro.',
          12: [
            'Avance temático negro (6...e4): gana tiempo atacando el caballo de f3. Establece una base firme para desarrollar las piezas y disputar el control central.',
            '6...Te8 es la alternativa posicional tranquila.',
            'Inicia una secuencia forzada muy instructiva.',
          ],
          13: 'El caballo blanco salta a g5 atacando a su vez el peón avanzado de e4. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          14: 'Las negras eliminan el caballo de c3 (que también atacaba e4) doblando los peones blancos.',
          15: 'Recaptura con el peón de b abriendo la columna b y preparando recuperar o minar el peón de e4 con f3 o d3.',
          16: 'La torre negra defiende el peón de e4: las blancas seguirán con 9.f3 exf3 10.Cxf3 y d3-e4 con la pareja de alfiles y un potente centro.',
        },
      },
      {
        id: 'inglesa-simetrica',
        name: 'Variante Simétrica (1.c4 c5 2.Cc3 Cc6 3.g3 g6 4.Ag2 Ag7)',
        kind: 'secundaria',
        eco: 'A37',
        idea: 'Las negras copian el esquema de fianchetto blanco llevando a luchas estratégicas y al Sistema Erizo.',
        moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d3 d6 a3 a6 Rb1',
        notes: {
          2: '1...c5 plantea la Variante Simétrica de la Inglesa: las blancas suelen romper la simetría con Tb1 y b4 o con d4.',
        },
      },
      {
        id: 'inglesa-botvinnik',
        name: 'Sistema Botvinnik (c4, Cc3, g3, Ag2, e4, Cge2 y d3)',
        kind: 'secundaria',
        eco: 'A26',
        idea: 'Colocar peones en c4 y e4 con el caballo en e2 para controlar férreamente d5 y preparar f4 o d4.',
        moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4 Nge7 Nge2 O-O O-O Be6',
        notes: {
          11: '6.e4! define la Formación Botvinnik: las blancas ceden el agujero en d4 pero dominan d5 y preparan el ataque en el flanco de rey con f4.',
        },
      },
    ],
  },
  {
    id: 'reti',
    name: 'Apertura Réti',
    short: 'Apertura Réti',
    eco: 'A09',
    category: 'flanco',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 4,
    frequency: 'El emblema del ajedrez hipermoderno; empleada por Réti, Capablanca, Kramnik y Aronian.',
    history:
      'Inmortalizada por el gran maestro checoslovaco Richard Réti en el Torneo de Nueva York de 1924, donde con 1.Cf3 d5 2.c4! derrotó al imbatido campeón mundial José Raúl Capablanca (quien llevaba ocho años sin perder una partida). En vez de ocupar el centro con peones, las blancas lo presionan desde ambos flancos.',
    goals: [
      'Desarrollar 1.Cf3 controlando d4 y e5 sin comprometer ningún peón central.',
      'Atacar el peón negro de d5 desde el flanco con 2.c4 y fianchettar uno o ambos alfiles en g2 y b2.',
      'Mantener las columnas y diagonales abiertas para golpear el centro negro con d3/e4 o b3.',
    ],
    plans: {
      w: [
        'Fianchettar en g2 (y a menudo también en b2: doble fianchetto), enrocar y recuperar el peón de c4 con Dc2 o Ca3 si las negras capturan 2...dxc4.',
        'Contra 2...c6 o 2...e6, presionar d5 con b3 y Ab2 manteniendo el peón de d2 en d3.',
      ],
      b: [
        'Avanzar 2...d4 (ganando espacio tipo Benoni Invertida), sostener con 2...c6 (permitiendo sacar el alfil a f5/g4) o jugar 2...e6.',
        'Si se captura 2...dxc4, devolver el peón tras ...c5 o ...a6 y ...b5.',
      ],
    },
    structures: [
      'Doble fianchetto blanco (alfiles en b2 y g2 con peones en c4, d3 y g3) presionando el centro negro a distancia.',
      'Benoni Invertida tras 2...d4 3.b4 o 3.e3.',
    ],
    keySquares: [
      { square: 'd5', role: 'Punto central negro atacado por el peón blanco de c4 y el alfil de g2.' },
      { square: 'e4', role: 'Casilla controlada por el caballo blanco de f3 y el alfil de b2.' },
      { square: 'g2', role: 'Fianchetto de rey blanco.' },
      { square: 'b2', role: 'Segundo fianchetto blanco que caracteriza al sistema puro de Réti.' },
    ],
    development: [
      { piece: 'Caballo de g1', idea: 'Sale en la primera jugada a f3 impidiendo 1...e5.' },
      { piece: 'Alfil de f1', idea: 'Se fianchetta en g2 apuntando hacia d5 y el flanco de dama negro.' },
      { piece: 'Alfil de c1', idea: 'Se fianchetta en b2 (tras b3) apuntando hacia e5 y g7.' },
    ],
    commonMistakes: [
      'Con negras: tras 1.Cf3 d5 2.c4 d4 3.b4, permitir que las blancas abran la gran diagonal y presionen d4 sin sostenerlo con ...c5 o ...f6.',
      'Con blancas: cerrar las diagonales de sus propios alfiles fianchettados con avances de peones mal calculados.',
    ],
    traps: [
      {
        id: 'reti-trampa-capablanca-1924',
        name: 'Celada posicional-táctica en la línea 2...dxc4 3.Na3 c5 4.Nxc4 Nc6 5.b3',
        moves: 'Nf3 d5 c4 dxc4 e3 c5 Bxc4 e6 O-O Nf6 b3 Nc6 Bb2 Be7 d4 cxd4 Nxd4',
        victim: 'b',
        mistakePly: 6,
        explanation:
          'Si tras 2...dxc4 3.e3 las negras intentan impedir Axc4 con 3...b5?!, sigue 4.a4 c6 5.axb5 cxb5 6.b3! y la estructura negra del flanco de dama se desmorona ante la apertura de las columnas a y c.',
      },
    ],
    famousGames: [
      {
        white: 'Richard Réti',
        black: 'José Raúl Capablanca',
        event: 'Torneo Internacional de Nueva York',
        year: 1924,
        result: '1-0',
        note: 'La partida histórica que dio nombre a la Apertura Réti y puso fin a los ocho años de imbatibilidad de Capablanca.',
      },
    ],
    lines: [
      {
        id: 'reti-principal',
        name: 'Sistema Clásico de Doble Fianchetto (1.Cf3 d5 2.c4 c6 3.b3 Cf6 4.g3)',
        kind: 'principal',
        eco: 'A09',
        idea: 'Presionar el centro negro desde ambos flancos con los alfiles en g2 y b2 sin avanzar d4.',
        moves: 'Nf3 d5 c4 c6 b3 Nf6 g3 Bf5 Bg2 e6 Bb2 Nbd7 O-O Be7 d3 O-O Nbd2',
        notes: {
          1: [
            '¡Movimiento hipermoderno inicial (1.Cf3)! Desarrolla una pieza hacia el centro e impide 1...e5 sin comprometer ningún peón.',
            'Mantiene total flexibilidad sobre la estructura central.',
            'Fue el sello de Richard Réti y Vladimir Kramnik.',
          ],
          2: 'Las negras ocupan el centro con su peón de dama en d5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          3: [
            '¡La Apertura Réti pura (2.c4)! Las blancas atacan lateralmente el peón negro de d5 sin haber jugado d4.',
            'Si las blancas jugasen luego d4 se transpondría a la Catalana o al Gambito de Dama; el espíritu de Réti es mantener el peón en d3.',
            '2.g3 directo es el Ataque Indio de Rey.',
          ],
          4: [
            'Defensa Eslava / Londres Invertida (2...c6): las negras sostienen firmemente su peón de d5 dejando abierta la diagonal para sacar el alfil de c8 a f5 o g4.',
            '2...d4 (Avance) y 2...dxc4 (Aceptada) son las otras dos respuestas principales.',
            'Es la defensa más sólida contra la Réti.',
          ],
          5: [
            'Prepara el fianchetto del alfil de dama en b2 (Sistema Capablanca-Réti).',
            'Además defiende el peón de c4 por si las negras capturan ...dxc4.',
            '3.g3 directo también es muy habitual.',
          ],
          6: 'Desarrolla el caballo a f6 controlando e4 y d5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          7: 'Prepara el segundo fianchetto en g2: ambos alfiles blancos dominarán las dos grandes diagonales.',
          8: [
            'Las negras aprovechan que el peón está en c6 para desarrollar su alfil de casillas blancas a f5 antes de jugar ...e6.',
            '4...Ag4 (Variante Nueva York) también es excelente.',
            'Controla la diagonal b1-h7.',
          ],
          9: 'El alfil blanco de rey se instala en g2. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          10: 'Una vez fuera el alfil en f5, las negras cierran su cadena con ...e6 y abren paso al alfil de f8.',
          11: 'Completa el doble fianchetto blanco: los alfiles en b2 y g2 apuntan de forma cruzada al centro y a ambos flancos.',
          12: 'Desarrolla el caballo por d7 para no obstruir el peón c ni el alfil. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          13: 'Las blancas completan el enroque corto, poniendo a su rey en seguridad y conectando la torre de f1 con el centro.',
          14: 'Desarrolla el alfil a e7 preparando el enroque corto (7...Ad6 o 7...h6 evitando Ch4 también se juegan).',
          15: 'El peón blanco va a d3 (¡nunca d4 en la Réti pura!) para preparar Cbd2 y la ruptura central e4.',
          16: 'Las negras realizan el enroque corto para poner a su rey en seguridad antes de abrir el centro de la partida.',
          17: 'Completa el desarrollo menor blanco: el plan ahora es Dc2 y e4 (o Ce5/Ch4 contra el alfil de f5).',
        },
      },
      {
        id: 'reti-avance-2d4',
        name: 'Variante del Avance (1.Cf3 d5 2.c4 d4 3.b4)',
        kind: 'secundaria',
        eco: 'A09',
        idea: 'Las negras ganan espacio con 2...d4 y las blancas minan la cadena con el gambito posicional 3.b4 o 3.e3.',
        moves: 'Nf3 d5 c4 d4 b4 f6 e3 e5 c5 a5 Bc4 axb4 exd4 exd4 O-O',
        notes: {
          4: 'Con 2...d4 las negras entran en una Benoni con colores cambiados; 3.b4! impide ...c5 y prepara atacar el centro negro.',
        },
      },
      {
        id: 'reti-aceptada-2dxc4',
        name: 'Variante Aceptada (1.Cf3 d5 2.c4 dxc4 3.Ca3)',
        kind: 'secundaria',
        eco: 'A09',
        idea: 'Recuperar inmediatamente el peón de c4 con el caballo por a3 y luchar por la casilla e5.',
        moves: 'Nf3 d5 c4 dxc4 Na3 c5 Nxc4 Nc6 b3 f6 Bb2 e5 g3 Be6',
        notes: {
          5: '3.Ca3 recupera el peón en c4 colocando el caballo en una excelente casilla centralizada sin mover aún el peón e.',
        },
      },
    ],
  },
  {
    id: 'bird',
    name: 'Apertura Bird',
    short: 'Apertura Bird',
    eco: 'A03',
    category: 'flanco',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 3,
    frequency: 'Especialidad de jugadores creativos que buscan una Defensa Holandesa con un tiempo de ventaja.',
    history:
      'Lleva el nombre del maestro inglés Henry Edward Bird (1830–1908), quien la adoptó hacia 1855 y ganó con ella premios de belleza contra los mejores jugadores de su época. En el siglo XX Bent Larsen la empleó al más alto nivel. Con 1.f4 las blancas toman el control de la casilla central e5 desde la primera jugada.',
    goals: [
      'Controlar inmediatamente la casilla central e5 desde la primera jugada con 1.f4 (una Defensa Holandesa con blancas y un tiempo extra).',
      'Fianchettar el alfil de dama con b3 y Ab2 (o jugar el Stonewall con d4 y Ad3) para duplicar el dominio sobre e5.',
      'Instalar un caballo en e5 y lanzar un ataque directo sobre el enroque corto negro.',
    ],
    plans: {
      w: [
        'Esquema Clásico con b3 y Ab2: controlar e5 con el peón de f4, el caballo de f3 y el alfil de b2, enrocar corto y llevar la dama por e1-h4.',
        'Contra el Gambito From (1...e5): aceptar con 2.fxe5 d6 3.exd6 Axd6 y desarrollar con cuidado (4.Cf3) vigilando la diagonal h4-e1.',
      ],
      b: [
        'Fianchettar el alfil de rey (...g6 y ...Ag7) junto con ...d5 y ...Cf6 para neutralizar la diagonal del alfil blanco de b2.',
        'O plantear el agudo Gambito From (1...e5!?) sacrificando un peón para atacar la diagonal débil e1-h4.',
      ],
    },
    structures: [
      'Holandesa Invertida con fianchetto de dama (peones blancos en f4, e3 y b3 con alfil en b2).',
      'Muro de Piedra Invertido (peones blancos en c3, d4, e3 y f4).',
    ],
    keySquares: [
      { square: 'e5', role: 'La casilla estratégica central que las blancas dominan con f4, Cf3 y Ab2.' },
      { square: 'b2', role: 'Casilla ideal del alfil blanco de dama para reforzar e5 y apuntar a g7.' },
      { square: 'h4', role: 'Casilla sensible en la diagonal del rey blanco (que obliga a desarrollar Cf3 temprano) y casilla de ataque para la dama blanca.' },
    ],
    development: [
      { piece: 'Caballo de g1', idea: 'Debe salir en la jugada 2 a f3 para cubrir el jaque ...Dh4+ y controlar e5.' },
      { piece: 'Alfil de c1', idea: 'Se fianchetta en b2 convirtiéndose en la pieza más peligrosa de las blancas.' },
      { piece: 'Alfil de f1', idea: 'Sale a e2 o b5 (para cambiar el caballo negro de c6 que controla e5) o a d3.' },
    ],
    commonMistakes: [
      'Con blancas: retrasar Cf3 tras 1.f4 y caer en jaques de dama o sacrificios en g3/h4 en el Gambito From.',
      'Con blancas: debilitar las casillas blancas centrales jugando e4 sin preparación.',
    ],
    traps: [
      {
        id: 'bird-trampa-gambito-from',
        name: 'Mate en el Gambito From tras 4.g3? g5 5.Ah3?? g4!',
        moves: 'f4 e5 fxe5 d6 exd6 Bxd6 Nf3 g5 h3 Bg3#',
        victim: 'w',
        mistakePly: 9,
        explanation:
          'En el Gambito From (1.f4 e5 2.fxe5 d6 3.exd6 Axd6 4.Cf3 g5), las blancas deben responder 5.d4! o 5.g3 (tras 4.Cf3). Si juegan pasivamente 5.h3?? intentando frenar ...g4, la casilla g3 queda desprotegida y 5...Ag3# es jaque mate en cinco jugadas.',
      },
    ],
    famousGames: [
      {
        white: 'Emanuel Lasker',
        black: 'Johann Hermann Bauer',
        event: 'Torneo Internacional de Ámsterdam',
        year: 1889,
        result: '1-0',
        note: 'La inmortal partida donde Lasker introdujo por primera vez en la historia el doble sacrificio de alfiles (15.Axh7+! y 16.Axg7!!) partiendo de la Apertura Bird.',
      },
    ],
    lines: [
      {
        id: 'bird-principal',
        name: 'Variante Clásica con Fianchetto de Dama (1.f4 d5 2.Cf3 Cf6 3.e3 g6 4.b3)',
        kind: 'principal',
        eco: 'A03',
        idea: 'Coordinar el peón de f4, el caballo de f3 y el alfil de b2 sobre la casilla central e5.',
        moves: 'f4 d5 Nf3 Nf6 e3 g6 b3 Bg7 Bb2 O-O Be2 c5 O-O Nc6 Ne5 Bd7',
        notes: {
          1: [
            '¡La Apertura Bird (1.f4)! Las blancas toman el control inmediato de la casilla central e5 y anuncian intenciones de ataque en el flanco de rey.',
            'Equivale a una Defensa Holandesa jugada con blancas y un tiempo de ventaja.',
            'Lleva el juego a posiciones originales fuera de los caminos trillados.',
          ],
          2: [
            'La respuesta más sólida y frecuente: las negras ocupan el centro con 1...d5 y controlan e4.',
            '1...e5!? es el agudo Gambito From.',
            'Plantea un duelo directo por las casillas centrales e4 y e5.',
          ],
          3: [
            'Jugada esencial: desarrolla el caballo a f3 sumando control sobre e5 y cubriendo la diagonal e1-h4.',
            'Nunca debe omitirse Cf3 temprano tras 1.f4.',
            'Prepara e3 y b3.',
          ],
          4: 'Desarrolla el caballo a f6 controlando e4 y d5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          5: 'Abre la diagonal para el alfil de f1 y sostiene el peón de f4. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          6: [
            'El método más eficaz para las negras contra la Bird: fianchettar el alfil de rey en g7.',
            'Desde g7 el alfil negro se opondrá directamente en la gran diagonal al futuro alfil blanco de b2.',
            '3...Ag4 y 3...Af5 también son buenas opciones.',
          ],
          7: [
            'El plan clásico de Lasker y Larsen (4.b3): fianchettar el alfil de c1 en b2.',
            'En la Apertura Bird el peón de e6/e3 cerraría la diagonal c1-h6, por lo que b2 es la casilla perfecta para el alfil de dama.',
            '4.d4 lleva al Muro de Piedra Invertido.',
          ],
          8: 'El alfil negro ocupa g7. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          9: 'El alfil blanco se instala en b2 apuntando hacia e5 y al enroque negro (como en Lasker–Bauer 1889).',
          10: 'Las negras completan el enroque corto, asegurando el flanco de rey y preparando el contrajuego central.',
          11: 'Desarrolla el alfil a e2 preparando el enroque corto (6.Ab5+ cambiando el caballo de c6 también es muy habitual).',
          12: 'Las negras ganan espacio en el centro y flanco de dama con ...c5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          13: 'Las blancas completan el enroque corto, poniendo a su rey en seguridad y conectando la torre de f1 con el centro.',
          14: 'Desarrolla el caballo a c6 luchando por e5 y d4. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          15: '¡Objetivo estratégico cumplido! El caballo blanco se instala en el puesto avanzado e5 apoyado por f4 y Ab2.',
          16: 'Las negras desarrollan el alfil a d7 para evitar peones doblados y conectar las torres.',
        },
      },
      {
        id: 'bird-gambito-from',
        name: 'Gambito From (1.f4 e5 2.fxe5 d6 3.exd6 Axd6 4.Cf3)',
        kind: 'secundaria',
        eco: 'A02',
        idea: 'Las negras sacrifican el peón e para desarrollar a toda velocidad y atacar el flanco de rey blanco.',
        moves: 'f4 e5 fxe5 d6 exd6 Bxd6 Nf3 g5 d4 g4 Ne5 Bxe5 dxe5 Qxd1+ Kxd1',
        notes: {
          2: '1...e5! es el Gambito From: si las blancas no quieren entrar en él pueden transponer al Gambito de Rey con 2.e4.',
          9: 'Contra el ataque 4...g5, el golpe central 5.d4! es la refutación posicional exacta devolviendo el peón para llegar a un buen final.',
        },
      },
      {
        id: 'bird-stonewall-d4',
        name: 'Muro de Piedra Invertido (1.f4 d5 2.Cf3 Cf6 3.e3 c5 4.d4)',
        kind: 'secundaria',
        eco: 'A03',
        idea: 'Fijar la formación Stonewall con peones en c3, d4, e3 y f4 y colocar el alfil en d3.',
        moves: 'f4 d5 Nf3 Nf6 e3 c5 d4 Nc6 c3 Bg4 Bd3 e6 O-O Bd6',
        notes: {
          7: 'Con 4.d4 y 5.c3 las blancas juegan el Muro de Piedra con un tiempo extra respecto a la Defensa Holandesa.',
        },
      },
    ],
  },
  {
    id: 'larsen',
    name: 'Apertura Larsen (Ataque Nimzowitsch-Larsen)',
    short: 'Apertura Larsen',
    eco: 'A01',
    category: 'flanco',
    side: 'w',
    studyAs: 'w',
    level: 'intermedio',
    popularity: 4,
    frequency: 'Moderna, hipermoderna y llena de veneno; favorita de Bent Larsen, Baadur Jobava y Hikaru Nakamura.',
    history:
      'Practicada en los años veinte por Aaron Nimzowitsch y llevada a la cima mundial en los años sesenta y setenta por el legendario Gran Maestro danés Bent Larsen (quien derrotó con ella a Boris Spassky, Tigran Petrosian y Mikhail Tal). Con 1.b3 y 2.Ab2 las blancas apuntan desde la primera jugada a la casilla central e5 y al punto g7.',
    goals: [
      'Fianchettar en la jugada 2 el alfil de dama en b2 (1.b3 y 2.Ab2) para dominar la gran diagonal a1-h8 (casillas e5, d4 y g7).',
      'Invitar a las negras a avanzar sus peones centrales (...e5 y ...d5) para atacarlos luego con e3, c4, Cf3 y f4.',
      'Mantener una estructura flexible que evita cualquier preparación teórica de memoria del rival.',
    ],
    plans: {
      w: [
        'Contra 1...e5: jugar 2.Ab2 Cc6 3.e3 d5 4.Ab5! clavando el caballo que defiende e5, seguido de Cf3 y f4 (o d4).',
        'Contra 1...d5: jugar 2.Ab2 c5 3.e3 Cf6 4.Cf3 y romper el centro negro con c4 o Ab5+.',
      ],
      b: [
        'Variante Moderna (1...e5): ocupar el centro con ...e5 y ...d5 sosteniendo el peón de e5 con ...Ad6 o ...f6.',
        'Variante Clásica (1...d5 y ...c5): controlar el centro y desarrollar el alfil de casillas negras fuera de la cadena (...Af5 o ...Ag4) antes de ...e6.',
      ],
    },
    structures: [
      'Fianchetto de dama blanco (b3+Ab2 y e3) frente al centro clásico negro (d5+e5): lucha hipermoderna pura entre piezas a distancia y centro de peones.',
    ],
    keySquares: [
      { square: 'b2', role: 'La base de operaciones del alfil blanco que barre la gran diagonal a1-h8.' },
      { square: 'e5', role: 'Peón central negro bajo presión constante del alfil de b2, el caballo de f3 y la clavada Ab5.' },
      { square: 'g7', role: 'Objetivo táctico directo al fondo de la diagonal del alfil de b2.' },
      { square: 'b5', role: 'Casilla clave para el otro alfil blanco (Ab5) clavando al caballo de c6.' },
    ],
    development: [
      { piece: 'Alfil de c1', idea: 'Sale en la jugada 2 a b2 dominando la gran diagonal.' },
      { piece: 'Alfil de f1', idea: 'Sale activamente a b5 (para clavar el caballo de c6 y atacar e5) o a e2/d3.' },
      { piece: 'Caballo de g1', idea: 'Se desarrolla a f3 sumándose al ataque sobre e5.' },
    ],
    commonMistakes: [
      'Con negras: avanzar ...e5 y ...d5 descuidando la defensa del peón de e5 y del punto g7 en la gran diagonal.',
      'Con blancas: permitir que las negras consoliden ...d4 cerrando para siempre la diagonal del alfil de b2.',
    ],
    traps: [
      {
        id: 'larsen-trampa-g7-th8',
        name: 'El rayo X sobre g7 y h8 (1.b3 e5 2.Ab2 Cc6 3.c4 Cf6 4.Cf3 e4 5.Cd4 Bc5 6.Nxc6 dxc6 7.e3 Bf5)',
        moves: 'b3 e5 Bb2 d6 c4 Nf6 Nc3 g6 d4 exd4 Qxd4 Bg7 Nd5 Nh5 Qe3+ Be6 Bxg7 Nxg7 Qc3 O-O Nf6+',
        victim: 'b',
        mistakePly: 14,
        explanation:
          'El tema táctico clásico de Bent Larsen en la gran diagonal a1-h8: cuando la dama y el alfil de b2 se alinean en la diagonal (batería Ab2+Dd4/Dc3), cualquier descuido negro en g7 o f6 permite sacrificios y saltos como Cd5 y Cf6+ ganando material.',
      },
    ],
    famousGames: [
      {
        white: 'Bent Larsen',
        black: 'Boris Spassky',
        event: 'Encuentro URSS vs Resto del Mundo (Belgrado)',
        year: 1970,
        result: '0-1',
        note: 'Una de las partidas más famosas de la historia (aunque en esta ocasión Spassky firmó una miniatura inmortal con negras, consagró la fama mundial de 1.b3).',
      },
      {
        white: 'Bent Larsen',
        black: 'Tigran Petrosian',
        event: 'Copa Piatigorsky (Santa Mónica)',
        year: 1966,
        result: '1-0',
        note: 'Gran victoria de Bent Larsen sobre el entonces campeón mundial Tigran Petrosian.',
      },
    ],
    lines: [
      {
        id: 'larsen-principal',
        name: 'Variante Moderna (1.b3 e5 2.Ab2 Cc6 3.e3 d5 4.Ab5)',
        kind: 'principal',
        eco: 'A01',
        idea: 'Dejar que las negras formen el centro e5+d5 para atacarlo inmediatamente con Ab2, Ab5 y Cf3.',
        moves: 'b3 e5 Bb2 Nc6 e3 d5 Bb5 Bd6 f4 Qh4+ g3 Qe7 Nf3 f6 Nc3 Be6 O-O',
        notes: {
          1: [
            '¡La Apertura Nimzowitsch-Larsen (1.b3)! Las blancas preparan fianchettar su alfil de dama en b2 desde la primera jugada.',
            'Es la expresión más pura de la estrategia hipermoderna: controlar e5 y d4 con una pieza a distancia.',
            'Saca al rival de la teoría convencional desde el movimiento 1.',
          ],
          2: [
            'Variante Moderna (1...e5): las negras aceptan el guante ocupando el centro e impidiendo que el alfil de b2 domine sin oposición.',
            '1...d5 (Clásica) y 1...Cf6 (India) son las otras respuestas principales.',
            'Apunta a restringir al alfil blanco.',
          ],
          3: [
            'El alfil se instala en b2 atacando directamente el peón negro de e5. Establece una base firme para desarrollar las piezas y disputar el control central.',
            'Obliga a las negras a defender e5 en la jugada 2.',
            'Dominio de la gran diagonal a1-h8.',
          ],
          4: 'Las negras defienden su peón de e5 desarrollando el caballo a c6. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          5: [
            '3.e3 abre la diagonal para el alfil de f1 (que irá a b5) y controla d4. Establece una base firme para desarrollar las piezas y disputar el control central.',
            '3.c4 lleva a una Apertura Inglesa con el fianchetto en b2.',
            'Es el esquema predilecto de Nimzowitsch y Larsen.',
          ],
          6: 'Las negras ocupan todo el centro con 3...d5. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          7: [
            '¡Jugada temática (4.Ab5)! El alfil blanco clava el caballo de c6, único defensor del peón de e5.',
            'Los dos alfiles blancos en b2 y b5 convergen para destruir el centro negro.',
            'Amenaza ganar el peón de e5 en la siguiente jugada.',
          ],
          8: 'Las negras defienden el peón de e5 desarrollando su alfil a d6. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          9: [
            'Golpe hipermoderno clásico (5.f4!): las blancas atacan por segunda vez el peón de e5 y amenazan 6.fxe5 seguido de Axg7.',
            '5.Cf3 también es muy jugada y más tranquila.',
            'Provoca una lucha táctica inmediata.',
          ],
          10: [
            'Recurso táctico de las negras (5...Dh4+!): dan jaque para obligar a las blancas a jugar 6.g3 (cerrando la diagonal o debilitando casillas) antes de defender e5.',
            'Si 5...f6?! directo sin el jaque, 6.fxe5 fxe5 7.Axc6+ bxc6 8.Dh5+! sería muy fuerte.',
            'Fineza importante de este sistema.',
          ],
          11: 'Única respuesta: cubre el jaque y ataca la dama negra. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          12: 'La dama negra retrocede a e7 defendiendo e5 y preparando ...f6 o ...Ad7.',
          13: 'Desarrolla el caballo a f3 renovando la triple presión sobre el centro negro.',
          14: 'Las negras sostienen e5 con ...f6 (formando una sólida cadena aunque pierden tiempos).',
          15: 'El caballo blanco de dama sale a c3 atacando el peón central negro de d5.',
          16: 'Las negras defienden d5 con su alfil en e6. Refuerza la coordinación de las piezas y prepara la siguiente fase del plan estratégico.',
          17: 'Las blancas se enrocan corto con una posición muy dinámica donde el centro negro sigue bajo fuego constante.',
        },
      },
      {
        id: 'larsen-clasica-1d5',
        name: 'Variante Clásica (1.b3 d5 2.Ab2 c5 3.e3 Cf6 4.Cf3)',
        kind: 'secundaria',
        eco: 'A01',
        idea: 'Esquema posicional contra 1...d5 donde las blancas controlan la casilla e5 con Ab2 y Cf3.',
        moves: 'b3 d5 Bb2 c5 e3 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 Nc6 Bb5 Rc8 O-O',
        notes: {
          2: '1...d5 cierra la diagonal del alfil de b2 con un peón defendido, llevando a una lucha estratégica por la casilla e5.',
        },
      },
      {
        id: 'larsen-inglesa-3c4',
        name: 'Sistema Híbrido con 3.c4 (1.b3 e5 2.Ab2 Cc6 3.c4)',
        kind: 'secundaria',
        eco: 'A01',
        idea: 'Combinar el fianchetto en b2 con el avance c4 para luchar por d5 al estilo de la Apertura Inglesa.',
        moves: 'b3 e5 Bb2 Nc6 c4 Nf6 e3 d5 cxd5 Nxd5 a3 Bd6 Qc2 O-O Nf3',
        notes: {
          5: 'Con 3.c4 las blancas entran en una Siciliana Taimanov/Paulsen con colores invertidos y un tiempo de más.',
        },
      },
    ],
  },
];
