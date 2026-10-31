/**
 * Instancias del motor en el navegador.
 *
 * Se usan DOS instancias independientes de Stockfish (dos Web Workers):
 *  - `playEngine`: el rival. Su fuerza se limita según el nivel elegido.
 *  - `analysisEngine`: el analista. Siempre a fuerza completa, con MultiPV, para evaluar
 *    tus jugadas con la profundidad configurada, aunque el rival sea débil.
 */
import { StockfishEngine, createWorkerTransport } from './StockfishEngine';

export interface EngineFlavor {
  file: string;
  multiThreaded: boolean;
  threads: number;
  label: string;
}

let flavorPromise: Promise<EngineFlavor> | null = null;

/** Elige la variante WASM según las capacidades del navegador. */
export function detectFlavor(): Promise<EngineFlavor> {
  if (flavorPromise) return flavorPromise;
  flavorPromise = (async () => {
    let manifest: { single?: string; multi?: string } = {};
    try {
      const res = await fetch('/engine/manifest.json');
      if (res.ok) manifest = await res.json();
    } catch {
      /* se usa el nombre por defecto */
    }
    const single = manifest.single ?? 'stockfish-19-lite-single.js';
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    const canThread =
      typeof SharedArrayBuffer !== 'undefined' &&
      typeof crossOriginIsolated !== 'undefined' &&
      crossOriginIsolated &&
      !!manifest.multi &&
      cores > 2;
    if (canThread) {
      const threads = Math.max(1, Math.min(4, cores - 2));
      return { file: manifest.multi!, multiThreaded: true, threads, label: `Stockfish 19 lite WASM · ${threads} hilos` };
    }
    return { file: single, multiThreaded: false, threads: 1, label: 'Stockfish 19 lite WASM · 1 hilo' };
  })();
  return flavorPromise;
}

let playEngine: StockfishEngine | null = null;
let analysisEngine: StockfishEngine | null = null;
let currentFlavor: EngineFlavor | null = null;

export async function getEngines(hashMb = 32): Promise<{ play: StockfishEngine; analysis: StockfishEngine; flavor: EngineFlavor }> {
  const flavor = await detectFlavor();
  currentFlavor = flavor;
  const url = `/engine/${flavor.file}`;
  if (!analysisEngine) {
    analysisEngine = new StockfishEngine('analista', () => createWorkerTransport(url), {
      Hash: hashMb,
      Threads: flavor.threads,
      UCI_ShowWDL: false,
    });
  }
  if (!playEngine) {
    // El rival usa un solo hilo y poca memoria: no necesita más y deja CPU al analista.
    playEngine = new StockfishEngine('rival', () => createWorkerTransport(url), { Hash: 16, Threads: 1 });
  }
  return { play: playEngine, analysis: analysisEngine, flavor };
}

export function getFlavor(): EngineFlavor | null {
  return currentFlavor;
}

export function setAnalysisHash(mb: number) {
  analysisEngine?.setBaseOption('Hash', mb);
}

