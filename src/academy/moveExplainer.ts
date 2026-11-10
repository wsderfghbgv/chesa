/**
 * Explicador pedagógico de jugadas de apertura.
 *
 * Combina (a) la anotación de autor (el "por qué" estratégico, que solo un humano experto puede
 * aportar) con (b) hechos CALCULADOS sobre la posición real con chess.js y `features.ts`:
 * casillas controladas, amenazas, jaques, piezas atacadas, alternativas de la teoría. Así las
 * explicaciones nunca contradicen al tablero.
 */
import { Chess, type Move, type Square } from 'chess.js';
import { attackersOf, attacksFrom, development, kingSafety, threatsOf } from '../chess/features';
import { PIECE_NAME, PIECE_VALUE, localizeSan, other, pieceAt, type Color } from '../chess/utils';
import type { Arrow, MoveTeaching, Note, OpeningDef } from './types';

const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5'];
const EXT_CENTER: Square[] = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];

export function noteParts(note: Note | undefined): { why?: string; consequence?: string; alternative?: string } {
  if (note === undefined) return {};
  if (typeof note === 'string') return { why: note };
  return { why: note[0], consequence: note[1], alternative: note[2] };
}

const sqList = (sqs: Square[], max = 6): string => {
  const shown = sqs.slice(0, max);
  return shown.join(', ') + (sqs.length > max ? '…' : '');
};

const firstSentence = (text: string): string => {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
};

/** Texto de respaldo cuando no hay anotación de autor: se describe la jugada por principios. */
export function derivedWhy(before: Chess, after: Chess, mv: Move): string {
  const side = mv.color === 'w' ? 'las blancas' : 'las negras';
  const pn = PIECE_NAME[mv.piece];
  if (mv.flags.includes('k') || mv.flags.includes('q')) {
    return `Enroque ${mv.flags.includes('k') ? 'corto' : 'largo'}: pone al rey a salvo detrás de sus peones y conecta las torres, que quedan listas para entrar en juego. Es una de las prioridades de la apertura.`;
  }
  if (mv.piece === 'p') {
    const central = ['c', 'd', 'e', 'f'].includes(mv.to[0]) && ['3', '4', '5', '6'].includes(mv.to[1]);
    if (mv.captured) return `Captura con el peón de ${mv.from[0]} en ${mv.to}: cambia la estructura central y abre líneas para las piezas de ${side}.`;
    if (central) return `Avance de peón a ${mv.to} para ganar espacio y disputar el centro; además abre diagonales para el alfil y la dama de ${side}.`;
    return `El peón avanza a ${mv.to}: gana espacio en el flanco y prepara el desarrollo o el plan posterior de ${side}.`;
  }
  const dev = development(before, mv.color).undevelopedMinors - development(after, mv.color).undevelopedMinors;
  if (dev > 0 && (mv.piece === 'n' || mv.piece === 'b')) {
    return `Desarrolla ${pieceAt(mv.piece, mv.to).replace(/ de .*/, '')} a ${mv.to}, una casilla desde la que actúa sobre el centro; desarrollar rápido es la regla de oro de la apertura.`;
  }
  if (mv.piece === 'q') return `La dama se coloca en ${mv.to} con un objetivo concreto; se mueve la dama pronto solo cuando no puede ser atacada con ganancia de tiempo.`;
  if (mv.piece === 'r') return `La torre pasa a ${mv.to} para ocupar una columna útil y apoyar el plan central.`;
  return `${pn[0].toUpperCase() + pn.slice(1)} a ${mv.to}: reubica la pieza hacia una casilla más activa.`;
}

export interface TeachContext {
  opening: Pick<OpeningDef, 'plans' | 'keySquares' | 'name'>;
  note?: Note;
  /** Siguiente jugada teórica (tras ésta) con su explicación, si existe. */
  next?: { sanEs: string; mover: Color; why: string };
  /** Alternativas teóricas conocidas desde la posición previa (SAN en español + nombre de la variante). */
  siblings: Array<{ sanEs: string; variant: string }>;
}

export function teachMove(fenBefore: string, mv: Move, ctx: TeachContext): MoveTeaching {
  const before = new Chess(fenBefore);
  const after = new Chess(before.fen());
  after.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
  const mover = mv.color;
  const rival = other(mover);
  const parts = noteParts(ctx.note);

  /* --- casillas controladas por la pieza que se mueve (nuevas) --- */
  const attackedNow = attacksFrom(after, mv.to);
  const attackedBefore = before.get(mv.from) ? new Set(attacksFrom(before, mv.from)) : new Set<Square>();
  const isCastle = mv.flags.includes('k') || mv.flags.includes('q');
  const controlled = (isCastle ? [] : attackedNow).filter((s) => {
    const occ = after.get(s);
    return !occ || occ.color !== mover;
  });
  const newlyControlled = controlled.filter((s) => !attackedBefore.has(s));
  const shownControlled = (newlyControlled.length ? newlyControlled : controlled).slice(0, 8);
  const centralControlled = shownControlled.filter((s) => CENTER_SQUARES.includes(s));

  let controls: string;
  if (isCastle) {
    controls = `El rey queda en ${mv.flags.includes('k') ? 'g' : 'c'}${mover === 'w' ? '1' : '8'} y la torre salta a ${mv.flags.includes('k') ? 'f' : 'd'}${mover === 'w' ? '1' : '8'}, activa en el centro.`;
  } else if (shownControlled.length === 0) {
    controls = `No gana control de casillas nuevas: su valor es de coordinación.`;
  } else {
    const pieceLabel = PIECE_NAME[mv.piece];
    controls = `${pieceLabel[0].toUpperCase() + pieceLabel.slice(1)} en ${mv.to} controla ${sqList(shownControlled)}${centralControlled.length ? ` (centro: ${centralControlled.join(', ')})` : ''}.`;
  }

  /* --- amenazas: piezas rivales atacadas, jaque, capturas ganadoras --- */
  const attackedEnemies = attackedNow
    .map((s) => ({ s, p: after.get(s) }))
    .filter((x): x is { s: Square; p: NonNullable<ReturnType<Chess['get']>> } => !!x.p && x.p.color === rival && x.p.type !== 'k');
  const threatTexts: string[] = [];
  if (after.isCheckmate()) threatTexts.push('¡Jaque mate!');
  else if (after.inCheck()) threatTexts.push('Da jaque al rey rival y obliga a responder.');
  const hangingThreats = threatsOf(after, mover).filter((t) => t.kind === 'capture').slice(0, 2);
  for (const t of hangingThreats) {
    if (t.target) threatTexts.push(`Amenaza ganar material: ${localizeSan(t.san, 'es')} capturaría ${pieceAt(t.target.type, t.target.square)}.`);
  }
  if (threatTexts.length === 0) {
    const worth = attackedEnemies
      .filter((x) => x.p.type !== 'p' || ['e', 'f', 'd', 'c'].includes(x.s[0]))
      .slice(0, 2)
      .map((x) => {
        const defenders = attackersOf(after, x.s, rival).length;
        return `${pieceAt(x.p.type, x.s)} (${defenders ? 'defendido' : 'sin defensa'})`;
      });
    if (worth.length) threatTexts.push(`Presiona ${worth.join(' y ')}; todavía no hay captura ganadora, pero obliga al rival a tenerlo en cuenta.`);
    else threatTexts.push('No crea una amenaza táctica inmediata: la jugada es de tipo posicional (espacio, desarrollo y coordinación).');
  }
  const threat = threatTexts.join(' ');

  /* --- por qué / consecuencia / alternativa --- */
  const why = parts.why ?? derivedWhy(before, after, mv);
  const planSide = mover === 'w' ? ctx.opening.plans.w : ctx.opening.plans.b;
  const consequence =
    parts.consequence ??
    (planSide[0] ? `Encaja en el plan de ${mover === 'w' ? 'las blancas' : 'las negras'}: ${planSide[0].replace(/\.$/, '')}.` : 'Mantiene la coordinación de las piezas.');

  let alternative = parts.alternative ?? '';
  if (ctx.siblings.length) {
    const sib = ctx.siblings.map((s) => `${s.sanEs} (${s.variant})`).slice(0, 4).join('; ');
    alternative += `${alternative ? ' ' : ''}La teoría también conoce en esta posición: ${sib}.`;
  }
  if (!alternative) {
    alternative = 'En esta posición la teoría es casi unánime. Si juegas otra cosa, pide al entrenador que la compare con el motor para ver exactamente qué se pierde.';
  }

  /* --- qué pretende el rival --- */
  const rivalText = ctx.next
    ? `A continuación el rival responde con ${ctx.next.sanEs}: ${firstSentence(ctx.next.why)}`
    : `El rival buscará su plan principal: ${(rival === 'w' ? ctx.opening.plans.w : ctx.opening.plans.b)[0] ?? 'completar su desarrollo'}.`;

  /* --- elementos visuales --- */
  const arrows: Arrow[] = [];
  if (!isCastle && ['n', 'b', 'q', 'r'].includes(mv.piece)) {
    const keyTargets = ctx.opening.keySquares.map((k) => k.square);
    const targets: Square[] = [];
    for (const x of attackedEnemies.sort((a, b) => PIECE_VALUE[b.p.type] - PIECE_VALUE[a.p.type])) {
      if (targets.length < 2) targets.push(x.s);
    }
    for (const k of keyTargets) if (targets.length < 2 && attackedNow.includes(k) && !targets.includes(k)) targets.push(k);
    for (const t of targets) {
      arrows.push({ orig: mv.to, dest: t, brush: after.get(t)?.color === rival ? 'red' : 'blue' });
    }
  }
  if (mv.piece === 'p' && centralControlled.length) {
    for (const c of centralControlled.slice(0, 2)) arrows.push({ orig: mv.to, dest: c, brush: 'green' });
  }
  if (arrows.length === 0) {
    arrows.push({ orig: mv.from, dest: mv.to, brush: 'green' });
  }
  const highlights: Square[] = [mv.to];
  for (const c of [...centralControlled, ...shownControlled.filter((s) => EXT_CENTER.includes(s))]) {
    if (!highlights.includes(c) && highlights.length < 4) highlights.push(c);
  }
  const threatened = attackedEnemies.map((x) => x.s).slice(0, 3);

  // El rey propio en jaque tras jugar el rival se resalta como casilla vulnerable.
  const ks = kingSafety(after, rival);
  if (after.inCheck() && ks.square && !threatened.includes(ks.square)) threatened.push(ks.square);

  return {
    why,
    consequence,
    alternative,
    controls,
    threat,
    rival: rivalText,
    controlledSquares: shownControlled,
    highlights,
    arrows,
    threatened,
    authored: parts.why !== undefined,
  };
}
