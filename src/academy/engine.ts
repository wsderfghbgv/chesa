/**
 * Servicio de motor de la Academia. REUTILIZA el motor Stockfish de la aplicación
 * (`getEngines().analysis`) y añade: caché por posición+profundidad, deduplicación de peticiones
 * en vuelo, y utilidades para valorar una jugada concreta. Nada aquí inicia un motor propio.
 *
 * Para las pruebas se puede inyectar otro motor con `setEngineProvider`.
 */
import { Chess } from 'chess.js';
import type { AnalysisRequest, AnalysisResult } from '../engine/StockfishEngine';
import { cpFor, formatScore, type Score } from '../engine/score';
import { fenKey, localizeSan, uciToSan, type Color, pvToSan, formatLine } from '../chess/utils';
import { effectiveCpLoss } from '../coach/classify';

export interface EngineLike {
  analyze(req: AnalysisRequest, opts?: { priority?: number; tag?: string }): Promise<AnalysisResult>;
}

let provider: () => Promise<EngineLike> = async () => {
  const { getEngines } = await import('../engine/engines');
  return (await getEngines()).analysis;
};

export function setEngineProvider(fn: () => Promise<EngineLike>) {
  provider = fn;
  cache.clear();
  inflight.clear();
}

const cache = new Map<string, AnalysisResult>();
const inflight = new Map<string, Promise<AnalysisResult>>();
const MAX_CACHE = 400;

export interface AnalyzeOptions {
  depth?: number;
  multipv?: number;
  priority?: number;
  searchmoves?: string[];
}

export async function analyzePosition(fen: string, opts: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const depth = opts.depth ?? 12;
  const multipv = opts.multipv ?? 3;
  const sm = opts.searchmoves?.length ? [...opts.searchmoves].sort().join(',') : '';
  const key = `${fen.split(' ').slice(0, 4).join(' ')}|${depth}|${multipv}|${sm}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // Un análisis más profundo o con más líneas ya guardado sirve para una petición menor.
  const flying = inflight.get(key);
  if (flying) return flying;
  const p = (async () => {
    const engine = await provider();
    const res = await engine.analyze(
      { fen, depth, multipv, searchmoves: opts.searchmoves },
      { priority: opts.priority ?? 6, tag: 'academy' },
    );
    if (res.complete) {
      cache.set(key, res);
      if (cache.size > MAX_CACHE) {
        const first = cache.keys().next().value;
        if (first !== undefined) cache.delete(first);
      }
    }
    return res;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export type MoveVerdict = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const VERDICT_LABEL: Record<MoveVerdict, string> = {
  best: 'Mejor jugada',
  good: 'Jugada sólida',
  inaccuracy: 'Imprecisión',
  mistake: 'Error',
  blunder: 'Error grave',
};

export interface MoveJudgement {
  uci: string;
  san: string;
  sanEs: string;
  /** Evaluación tras la jugada (puntos de vista del bando que mueve, formateada). */
  scoreText: string;
  cpAfter: number;
  bestUci: string;
  bestSanEs: string;
  bestScoreText: string;
  bestCp: number;
  lossCp: number;
  verdict: MoveVerdict;
  /** Variante principal del motor tras la jugada evaluada, en SAN español. */
  line: string;
  depth: number;
}

export function verdictFor(lossCp: number): MoveVerdict {
  if (lossCp <= 15) return 'best';
  if (lossCp <= 60) return 'good';
  if (lossCp <= 130) return 'inaccuracy';
  if (lossCp <= 300) return 'mistake';
  return 'blunder';
}

/** Evalúa una jugada concreta con el motor real y la compara con la mejor de la posición. */
export async function judgeMove(fen: string, uci: string, depth = 12): Promise<MoveJudgement> {
  const mover: Color = new Chess(fen).turn();
  const [top, played] = await Promise.all([
    analyzePosition(fen, { depth, multipv: 3 }),
    analyzePosition(fen, { depth, multipv: 1, searchmoves: [uci] }),
  ]);
  const best = top.lines[0];
  const bestUci = best?.pv[0] ?? top.bestMove ?? uci;
  // Si la jugada está entre las líneas principales usamos esa valoración (misma profundidad).
  const inTop = top.lines.find((l) => l.pv[0] === uci);
  const playedLine = inTop ?? played.lines[0];
  const bestScore: Score = best?.score ?? { kind: 'cp', value: 0 };
  const playedScore: Score = playedLine?.score ?? bestScore;
  const bestCp = cpFor(bestScore, mover);
  const cpAfter = cpFor(playedScore, mover);
  const loss = uci === bestUci ? 0 : effectiveCpLoss(bestCp, cpAfter);
  const sanPlayed = uciToSan(fen, uci);
  const pv = playedLine?.pv ?? [uci];
  return {
    uci,
    san: sanPlayed,
    sanEs: localizeSan(sanPlayed, 'es'),
    scoreText: formatScore(playedScore, mover),
    cpAfter,
    bestUci,
    bestSanEs: localizeSan(uciToSan(fen, bestUci), 'es'),
    bestScoreText: formatScore(bestScore, mover),
    bestCp,
    lossCp: loss,
    verdict: verdictFor(loss),
    line: formatLine(fen, pvToSan(fen, pv, 6)),
    depth: Math.min(top.depth, played.depth || top.depth),
  };
}

export interface EngineLineSummary {
  sanEs: string;
  uci: string;
  scoreText: string;
  cp: number;
  line: string;
}

/** Mejores jugadas del motor (valoración desde el bando que mueve). */
export async function topMoves(fen: string, count = 3, depth = 12): Promise<EngineLineSummary[]> {
  const mover: Color = new Chess(fen).turn();
  const res = await analyzePosition(fen, { depth, multipv: Math.max(count, 3) });
  return res.lines.slice(0, count).map((l) => ({
    sanEs: localizeSan(uciToSan(fen, l.pv[0]), 'es'),
    uci: l.pv[0],
    scoreText: formatScore(l.score, mover),
    cp: cpFor(l.score, mover),
    line: formatLine(fen, pvToSan(fen, l.pv, 6)),
  }));
}

export function clearAcademyEngineCache() {
  cache.clear();
}

export { fenKey };
