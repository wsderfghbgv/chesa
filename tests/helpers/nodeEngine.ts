/**
 * Transporte de Stockfish para Node (solo pruebas): lanza la misma compilación WASM
 * "lite-single" que usa el navegador en un subproceso Node comunicado por stdin/stdout
 * (equivalente exacto al Web Worker del navegador).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { StockfishEngine, type EngineTransport } from '../../src/engine/StockfishEngine';

const require = createRequire(import.meta.url);

export function createNodeTransport(): EngineTransport {
  let lineCb: (l: string) => void = () => {};
  let errCb: (e: unknown) => void = () => {};
  const sf = require('stockfish');
  const enginePath: string = sf.findEngine('lite-single');
  const child = spawn(process.execPath, [enginePath], { stdio: ['pipe', 'pipe', 'pipe'] });
  const rl = createInterface({ input: child.stdout });
  rl.on('line', (line) => lineCb(line));
  child.on('error', (err) => errCb(err));
  return {
    send: (cmd: string) => {
      if (!child.killed && child.stdin.writable) child.stdin.write(cmd + '\n');
    },
    onLine: (cb) => { lineCb = cb; },
    onError: (cb) => { errCb = cb; },
    terminate: () => {
      try { rl.close(); child.kill(); } catch { /* ignorado */ }
    },
  };
}

export function createNodeEngine(name = 'test'): StockfishEngine {
  return new StockfishEngine(name, createNodeTransport, { Hash: 16, Threads: 1 });
}
