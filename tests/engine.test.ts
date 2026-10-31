import { describe, it, expect, afterAll } from 'vitest';
import { Chess } from 'chess.js';
import { createNodeEngine } from './helpers/nodeEngine';
import { chooseOpponentMove } from '../src/engine/opponent';
import { LEVELS } from '../src/engine/levels';
import { cpFor } from '../src/engine/score';

const engine = createNodeEngine();
afterAll(() => engine.terminate());

describe('Stockfish real (WASM) vía UCI', () => {
  it('arranca y responde con una jugada legal desde la posición inicial', async () => {
    await engine.init();
    const fen = new Chess().fen();
    const r = await engine.analyze({ fen, depth: 10, multipv: 3 });
    expect(r.lines.length).toBe(3);
    expect(r.depth).toBeGreaterThanOrEqual(10);
    const chess = new Chess(fen);
    expect(() => chess.move(r.bestMove!)).not.toThrow();
    // La posición inicial está equilibrada.
    expect(Math.abs(cpFor(r.lines[0].score, 'w'))).toBeLessThan(100);
  });

  it('encuentra el mate en 1 (Dxf7#) y lo puntúa como mate', async () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const r = await engine.analyze({ fen, depth: 8 });
    expect(r.bestMove).toBe('h5f7');
    expect(r.lines[0].score).toEqual({ kind: 'mate', value: 1 });
  });

  it('normaliza la puntuación al punto de vista de las blancas cuando mueven negras', async () => {
    // Negras con dama de más, mueven negras: la evaluación (vista de blancas) debe ser muy negativa.
    const fen = '4k3/8/8/8/8/8/q7/4K3 b - - 0 1';
    const r = await engine.analyze({ fen, depth: 10 });
    expect(cpFor(r.lines[0].score, 'w')).toBeLessThan(-500);
  });

  it('las evaluaciones cambian según la posición', async () => {
    const equal = await engine.analyze({ fen: new Chess().fen(), depth: 10 });
    const whiteUp = await engine.analyze({ fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', depth: 10 });
    expect(cpFor(whiteUp.lines[0].score, 'w')).toBeGreaterThan(cpFor(equal.lines[0].score, 'w') + 500);
  });

  it('una búsqueda más prioritaria detiene la actual sin mezclar respuestas', async () => {
    const slow = engine.analyze({ fen: new Chess().fen(), depth: 40, movetime: 20000 }, { priority: 1, cacheable: false });
    await new Promise((r) => setTimeout(r, 300));
    const fen2 = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    const fast = engine.analyze({ fen: fen2, depth: 8 }, { priority: 10 });
    const [s, f] = await Promise.all([slow, fast]);
    expect(s.complete).toBe(false);
    expect(f.bestMove).toBe('d1d8');
  });

  it('el rival responde con jugadas legales en todos los niveles', async () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('e5');
    for (const level of LEVELS) {
      const lvl = { ...level, movetime: Math.min(level.movetime, 300) };
      const res = await chooseOpponentMove(engine, lvl, { startFen: new Chess().fen(), moves: ['e2e4', 'e7e5'], fen: chess.fen(), maxMovetime: 300 });
      const c = new Chess(chess.fen());
      expect(() => c.move(res.uci), `nivel ${level.id}: ${res.uci}`).not.toThrow();
    }
  });
});

