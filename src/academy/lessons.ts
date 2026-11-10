/**
 * Compilación de la biblioteca: convierte las definiciones declarativas en líneas con FEN,
 * UCI y enseñanza por jugada. Toda jugada se valida con chess.js; si una línea contuviese una
 * jugada ilegal se lanza un error (los tests lo detectan) en lugar de mostrar datos corruptos.
 */
import { Chess, type Move } from 'chess.js';
import { START_FEN, fenKey, localizeSan, moveToUci } from '../chess/utils';
import { OPENING_DEFS } from './library';
import { derivedWhy, noteParts, teachMove } from './moveExplainer';
import type { CompiledLine, CompiledMove, CompiledOpening, Note, OpeningDef } from './types';

const splitSan = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);

interface Sibling {
  uci: string;
  sanEs: string;
  variant: string;
}

function replayVerbose(moves: string[]): { fens: string[]; verbose: Move[] } {
  const chess = new Chess();
  const fens = [chess.fen()];
  const verbose: Move[] = [];
  for (const san of moves) {
    const m = chess.move(san);
    verbose.push(m);
    fens.push(chess.fen());
  }
  return { fens, verbose };
}

const cache = new Map<string, CompiledOpening>();

export function compileOpening(def: OpeningDef): CompiledOpening {
  const hit = cache.get(def.id);
  if (hit) return hit;

  const replays = def.lines.map((l) => replayVerbose(splitSan(l.moves)));

  // 1) Anotaciones heredadas por posición (la primera línea que anota una posición+jugada manda)
  const inherited = new Map<string, Note>();
  // 2) Alternativas teóricas conocidas desde cada posición
  const siblings = new Map<string, Sibling[]>();
  def.lines.forEach((line, li) => {
    const { fens, verbose } = replays[li];
    verbose.forEach((mv, i) => {
      const k = fenKey(fens[i]);
      const note = line.notes?.[i + 1];
      const nk = `${k}|${mv.san}`;
      if (note !== undefined && !inherited.has(nk)) inherited.set(nk, note);
      const list = siblings.get(k) ?? [];
      const uci = moveToUci(mv);
      if (!list.some((s) => s.uci === uci)) list.push({ uci, sanEs: localizeSan(mv.san, 'es'), variant: line.name });
      siblings.set(k, list);
    });
  });

  const compiled: CompiledLine[] = def.lines.map((line, li) => {
    const { fens, verbose } = replays[li];
    const noteAt = (i: number): Note | undefined => line.notes?.[i + 1] ?? inherited.get(`${fenKey(fens[i])}|${verbose[i].san}`);
    const whys = verbose.map((mv, i) => noteParts(noteAt(i)).why ?? derivedWhy(new Chess(fens[i]), new Chess(fens[i + 1]), mv));

    const moves: CompiledMove[] = verbose.map((mv, i) => {
      const uci = moveToUci(mv);
      const sibs = (siblings.get(fenKey(fens[i])) ?? []).filter((s) => s.uci !== uci);
      const next = verbose[i + 1]
        ? { sanEs: localizeSan(verbose[i + 1].san, 'es'), mover: verbose[i + 1].color, why: whys[i + 1] }
        : undefined;
      const teaching = teachMove(fens[i], mv, {
        opening: def,
        note: noteAt(i),
        next,
        siblings: sibs.map((s) => ({ sanEs: s.sanEs, variant: s.variant })),
      });
      // `why` ya calculado (evita recomputar derivedWhy)
      teaching.why = whys[i];
      return {
        ply: i + 1,
        san: mv.san,
        sanEs: localizeSan(mv.san, 'es'),
        uci,
        from: mv.from,
        to: mv.to,
        mover: mv.color,
        fenBefore: fens[i],
        fenAfter: fens[i + 1],
        teaching,
      };
    });
    const pgnParts: string[] = [];
    verbose.forEach((mv, i) => pgnParts.push(i % 2 === 0 ? `${i / 2 + 1}. ${mv.san}` : mv.san));
    return {
      id: line.id,
      openingId: def.id,
      name: line.name,
      kind: line.kind,
      eco: line.eco ?? def.eco,
      idea: line.idea ?? '',
      moves,
      fens,
      pgn: pgnParts.join(' '),
    };
  });

  const result: CompiledOpening = { ...def, compiled };
  cache.set(def.id, result);
  return result;
}

export const OPENING_IDS: string[] = OPENING_DEFS.map((o) => o.id);

export function getOpeningDef(id: string): OpeningDef | undefined {
  return OPENING_DEFS.find((o) => o.id === id);
}

/** Apertura compilada (memoizada). */
export function getOpening(id: string): CompiledOpening | undefined {
  const def = getOpeningDef(id);
  return def ? compileOpening(def) : undefined;
}

export function getLine(openingId: string, lineId: string): CompiledLine | undefined {
  return getOpening(openingId)?.compiled.find((l) => l.id === lineId);
}

export function startFen(): string {
  return START_FEN;
}
