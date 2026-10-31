/**
 * Selección de la jugada del rival según el nivel.
 * La legalidad la garantiza chess.js: la jugada elegida siempre se valida antes de aplicarla.
 */
import { Chess } from 'chess.js';
import type { StockfishEngine } from './StockfishEngine';
import type { StrengthLevel } from './levels';
import { cpFor } from './score';
import { sideToMove } from './uci';

export interface OpponentMoveResult {
  uci: string;
  /** Cómo se eligió (para transparencia en la interfaz). */
  method: 'engine' | 'policy' | 'random';
}

export interface OpponentContext {
  startFen: string;
  moves: string[];
  fen: string;
  /** Tiempo restante en reloj (ms), si hay reloj. */
  clockMs?: number;
  incrementMs?: number;
  maxMovetime?: number;
  tag?: string;
  rng?: () => number;
}

export async function chooseOpponentMove(engine: StockfishEngine, level: StrengthLevel, ctx: OpponentContext): Promise<OpponentMoveResult> {
  const rng = ctx.rng ?? Math.random;
  const chess = new Chess(ctx.fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) throw new Error('No hay jugadas legales');
  const toUci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');
  if (legal.length === 1) return { uci: toUci(legal[0]), method: 'engine' };

  let movetime = level.id === 'maximo' && ctx.maxMovetime ? ctx.maxMovetime : level.movetime;
  if (ctx.clockMs !== undefined) {
    // Con reloj: nunca gastar más de ~1/30 del tiempo restante (+ incremento).
    const budget = Math.max(50, ctx.clockMs / 30 + (ctx.incrementMs ?? 0) * 0.8);
    movetime = Math.min(movetime, budget);
  }
  movetime = Math.round(movetime);

  if (level.policy) {
    const p = level.policy;
    if (rng() < p.randomMoveChance) {
      return { uci: toUci(legal[Math.floor(rng() * legal.length)]), method: 'random' };
    }
    const res = await engine.analyze(
      {
        fen: ctx.fen,
        history: { startFen: ctx.startFen, moves: ctx.moves },
        depth: level.depth ?? 1,
        movetime,
        multipv: Math.min(p.multipv, legal.length),
        options: { 'Skill Level': 20 },
      },
      { priority: 10, tag: ctx.tag, cacheable: false },
    );
    const stm = sideToMove(ctx.fen);
    const cands = res.lines.filter((l) => l.pv.length > 0);
    if (cands.length === 0) return { uci: res.bestMove ?? toUci(legal[0]), method: 'engine' };
    const clamp = (v: number) => Math.max(-1500, Math.min(1500, v));
    const scores = cands.map((l) => clamp(cpFor(l.score, stm)));
    const best = Math.max(...scores);
    const weights = scores.map((s) => Math.exp((s - best) / p.temperatureCp));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < cands.length; i++) {
      r -= weights[i];
      if (r <= 0) return { uci: cands[i].pv[0], method: 'policy' };
    }
    return { uci: cands[0].pv[0], method: 'policy' };
  }

  const res = await engine.analyze(
    {
      fen: ctx.fen,
      history: { startFen: ctx.startFen, moves: ctx.moves },
      depth: level.depth ?? undefined,
      movetime,
      multipv: 1,
      options: { 'Skill Level': level.skill },
    },
    { priority: 10, tag: ctx.tag, cacheable: false },
  );
  const uci = res.bestMove ?? toUci(legal[0]);
  return { uci, method: 'engine' };
}

