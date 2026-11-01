/**
 * Envoltorio de Stockfish basado en UCI.
 *
 * - Se comunica con el motor a través de un "transporte" (Web Worker en el navegador,
 *   proceso WASM en Node para las pruebas). Así la lógica es la misma en ambos entornos.
 * - Serializa las búsquedas con una cola con prioridades: una búsqueda de mayor prioridad
 *   detiene la actual ("stop") y espera su "bestmove" antes de empezar, de modo que nunca se
 *   mezclan respuestas de posiciones distintas.
 * - Permite cancelar búsquedas por etiqueta (p. ej. al deshacer o empezar otra partida).
 * - Cachea resultados completos (LRU) para evitar análisis redundantes.
 * - Vigilancia (watchdog): si el motor deja de responder, se reinicia el worker.
 */
import { Chess } from 'chess.js';
import { validateFenSafe, other } from '../chess/utils';
import { parseBestMove, parseInfo, sideToMove, type InfoLine } from './uci';
import type { Score } from './score';

export interface EngineTransport {
  send(cmd: string): void;
  onLine(cb: (line: string) => void): void;
  onError(cb: (err: unknown) => void): void;
  terminate(): void;
}

export interface PvLine {
  multipv: number;
  depth: number;
  seldepth?: number;
  score: Score;
  pv: string[];
  nodes?: number;
  nps?: number;
}

export interface AnalysisRequest {
  /** FEN de la posición a analizar. */
  fen: string;
  /**
   * Historial opcional (FEN inicial + jugadas UCI) para que el motor conozca las
   * repeticiones de posición. Si se indica, debe desembocar en `fen`.
   */
  history?: { startFen: string; moves: string[] };
  depth?: number;
  movetime?: number;
  nodes?: number;
  multipv?: number;
  searchmoves?: string[];
  /** Opciones UCI a fijar justo antes de esta búsqueda (p. ej. "Skill Level"). */
  options?: Record<string, string | number | boolean>;
}

export interface AnalysisResult {
  fen: string;
  lines: PvLine[];
  bestMove: string | null;
  ponder?: string;
  depth: number;
  /** false si la búsqueda se detuvo antes de alcanzar el límite pedido. */
  complete: boolean;
  fromCache: boolean;
  timeMs: number;
}

export interface JobOptions {
  priority?: number;
  tag?: string;
  cacheable?: boolean;
  onInfo?: (partial: AnalysisResult) => void;
}

export class EngineCancelledError extends Error {
  constructor() {
    super('Análisis cancelado');
    this.name = 'EngineCancelledError';
  }
}
export const isCancelled = (e: unknown): boolean => e instanceof EngineCancelledError;

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'thinking' | 'error';

interface SearchJob {
  id: number;
  req: AnalysisRequest;
  opts: JobOptions;
  priority: number;
  resolve: (r: AnalysisResult) => void;
  reject: (e: unknown) => void;
  stopped: boolean;
  lines: Map<number, PvLine>;
  started: number;
  lastEmit: number;
  watchdog?: ReturnType<typeof setTimeout>;
}

const DEFAULT_PRIORITY = 5;
const CACHE_SIZE = 400;

export class StockfishEngine {
  readonly name: string;
  private factory: () => EngineTransport;
  private transport: EngineTransport | null = null;
  private baseOptions: Record<string, string | number | boolean>;
  private queue: SearchJob[] = [];
  private running: SearchJob | null = null;
  private nextId = 1;
  private readyPromise: Promise<void> | null = null;
  private readyWaiters: Array<() => void> = [];
  private uciWaiter: (() => void) | null = null;
  private currentMultiPv = 1;
  private appliedOptions = new Map<string, string>();
  private cache = new Map<string, AnalysisResult>();
  private statusListeners = new Set<(s: EngineStatus, detail?: string) => void>();
  status: EngineStatus = 'idle';
  engineId = 'Stockfish';
  lastError: string | null = null;

  constructor(name: string, factory: () => EngineTransport, baseOptions: Record<string, string | number | boolean> = {}) {
    this.name = name;
    this.factory = factory;
    this.baseOptions = baseOptions;
  }

  onStatus(cb: (s: EngineStatus, detail?: string) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(s: EngineStatus, detail?: string) {
    this.status = s;
    for (const cb of this.statusListeners) cb(s, detail);
  }

  /** Arranca el motor (idempotente). */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.setStatus('loading');
    this.readyPromise = new Promise<void>((resolve, reject) => {
      try {
        this.transport = this.factory();
      } catch (e) {
        this.fail(e);
        reject(e);
        return;
      }
      this.transport.onLine((l) => this.handleOutput(l));
      this.transport.onError((e) => this.fail(e));
      const timeout = setTimeout(() => {
        const err = new Error('El motor no respondió a "uci" en 30 s');
        this.fail(err);
        reject(err);
      }, 30000);
      this.uciWaiter = () => {
        for (const [k, v] of Object.entries(this.baseOptions)) this.setOptionNow(k, v);
        this.waitReady().then(() => {
          clearTimeout(timeout);
          this.setStatus('ready');
          resolve();
          this.pump();
        });
      };
      this.transport.send('uci');
    });
    return this.readyPromise;
  }

  private waitReady(): Promise<void> {
    return new Promise((res) => {
      this.readyWaiters.push(res);
      this.transport?.send('isready');
    });
  }

  private fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    this.lastError = msg;
    this.setStatus('error', msg);
    if (this.running) {
      clearTimeout(this.running.watchdog);
      this.running.reject(new Error(`Error del motor: ${msg}`));
      this.running = null;
    }
  }

  /** Reinicia por completo el worker (tras un bloqueo o error). Las búsquedas en cola se conservan. */
  async restart(): Promise<void> {
    try { this.transport?.terminate(); } catch { /* ignorado */ }
    this.transport = null;
    this.readyPromise = null;
    this.readyWaiters = [];
    this.appliedOptions.clear();
    this.currentMultiPv = 1;
    if (this.running) {
      clearTimeout(this.running.watchdog);
      this.running.reject(new Error('El motor se reinició durante el análisis'));
      this.running = null;
    }
    await this.init();
  }

  private setOptionNow(name: string, value: string | number | boolean) {
    const v = String(value);
    if (this.appliedOptions.get(name) === v) return;
    this.appliedOptions.set(name, v);
    this.transport?.send(`setoption name ${name} value ${v}`);
  }

  /** Fija una opción base (se aplica a todas las búsquedas futuras). */
  setBaseOption(name: string, value: string | number | boolean) {
    this.baseOptions[name] = value;
    if (!this.running && this.status === 'ready') this.setOptionNow(name, value);
  }

  private handleOutput(raw: string) {
    for (const line of String(raw).split('\n')) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('id name')) this.engineId = l.slice(8);
      if (l === 'uciok') { const w = this.uciWaiter; this.uciWaiter = null; w?.(); continue; }
      if (l === 'readyok') { const w = this.readyWaiters.shift(); w?.(); continue; }
      const job = this.running;
      if (!job) continue;
      if (l.startsWith('info')) {
        const info = parseInfo(l, sideToMove(job.req.fen));
        if (info && !info.bound && info.pv.length > 0) this.acceptInfo(job, info);
        continue;
      }
      const bm = parseBestMove(l);
      if (bm) {
        // En Stockfish 19 WASM (Asyncify), "bestmove" se emite justo antes de que C++ salga
        // de `go` (_isSearching sigue a 1 en este tick). Esperamos unos milisegundos antes de
        // despachar el siguiente comando UCI para no invocar `ccall` de forma reentrante.
        setTimeout(() => this.finish(job, bm.bestmove, bm.ponder), 5);
      }
    }
  }

  private acceptInfo(job: SearchJob, info: InfoLine) {
    job.lines.set(info.multipv, {
      multipv: info.multipv,
      depth: info.depth,
      seldepth: info.seldepth,
      score: info.score,
      pv: info.pv,
      nodes: info.nodes,
      nps: info.nps,
    });
    const now = Date.now();
    if (job.opts.onInfo && now - job.lastEmit > 120) {
      job.lastEmit = now;
      job.opts.onInfo(this.buildResult(job, null, undefined, false));
    }
  }

  private buildResult(job: SearchJob, bestMove: string | null, ponder: string | undefined, complete: boolean): AnalysisResult {
    const want = job.req.multipv ?? 1;
    const lines = [...job.lines.values()].filter((l) => l.multipv <= want).sort((a, b) => a.multipv - b.multipv);
    return {
      fen: job.req.fen,
      lines,
      bestMove: bestMove ?? lines[0]?.pv[0] ?? null,
      ponder,
      depth: lines[0]?.depth ?? 0,
      complete,
      fromCache: false,
      timeMs: Date.now() - job.started,
    };
  }

  private finish(job: SearchJob, bestMove: string | null, ponder?: string) {
    clearTimeout(job.watchdog);
    this.running = null;
    const result = this.buildResult(job, bestMove, ponder, !job.stopped);
    if (job.opts.onInfo) job.opts.onInfo(result);
    if (job.stopped && job.opts.tag === '__cancelled__') {
      job.reject(new EngineCancelledError());
    } else {
      if (result.complete && job.opts.cacheable !== false && !job.req.options) this.putCache(job.req, result);
      job.resolve(result);
    }
    this.setStatus('ready');
    this.pump();
  }

  private cacheKey(req: AnalysisRequest): string {
    const fen4 = req.fen.split(' ').slice(0, 4).join(' ');
    return `${fen4}|${req.multipv ?? 1}|${(req.searchmoves ?? []).join(',')}`;
  }

  private putCache(req: AnalysisRequest, r: AnalysisResult) {
    const key = this.cacheKey(req);
    const prev = this.cache.get(key);
    if (prev && prev.depth > r.depth) return;
    this.cache.delete(key);
    this.cache.set(key, r);
    if (this.cache.size > CACHE_SIZE) {
      const first = this.cache.keys().next().value;
      if (first !== undefined) this.cache.delete(first);
    }
  }

  /** Busca en caché un resultado con al menos la profundidad pedida. */
  peekCache(req: AnalysisRequest): AnalysisResult | null {
    const r = this.cache.get(this.cacheKey(req));
    if (!r) return null;
    if (req.depth && r.depth < req.depth) return null;
    return { ...r, fromCache: true };
  }

  clearCache() {
    this.cache.clear();
  }

  /** Encola un análisis. Se resuelve con el resultado (parcial si se detuvo). */
  analyze(req: AnalysisRequest, opts: JobOptions = {}): Promise<AnalysisResult> {
    const check = validateFenSafe(req.fen);
    if (!check.ok) {
      return Promise.reject(new Error(`FEN no válido: ${check.error}`));
    }
    const pos = new Chess(req.fen);
    if (pos.isGameOver()) {
      const stm = pos.turn();
      const score: Score = pos.isCheckmate()
        ? { kind: 'mate', value: 0, winner: other(stm) }
        : { kind: 'cp', value: 0 };
      const terminal: AnalysisResult = {
        fen: req.fen,
        lines: [{ multipv: 1, depth: 0, score, pv: [] }],
        bestMove: null,
        depth: 0,
        complete: true,
        fromCache: true,
        timeMs: 0,
      };
      opts.onInfo?.(terminal);
      return Promise.resolve(terminal);
    }
    if (opts.cacheable !== false && !req.options && !req.history) {
      const hit = this.peekCache(req);
      if (hit) {
        opts.onInfo?.(hit);
        return Promise.resolve(hit);
      }
    }
    return new Promise<AnalysisResult>((resolve, reject) => {
      const job: SearchJob = {
        id: this.nextId++,
        req,
        opts,
        priority: opts.priority ?? DEFAULT_PRIORITY,
        resolve,
        reject,
        stopped: false,
        lines: new Map(),
        started: 0,
        lastEmit: 0,
      };
      this.queue.push(job);
      this.queue.sort((a, b) => b.priority - a.priority || a.id - b.id);
      // Una petición más prioritaria detiene la búsqueda en curso.
      if (this.running && job.priority > this.running.priority && !this.running.stopped) {
        this.running.stopped = true;
        this.transport?.send('stop');
      }
      if (this.status !== 'loading' && !this.readyPromise) void this.init();
      this.pump();
    });
  }

  private pump() {
    if (this.running || this.status === 'loading' || this.status === 'error' || !this.transport) return;
    const job = this.queue.shift();
    if (!job) return;
    if (job.opts.cacheable !== false && !job.req.options && !job.req.history) {
      const hit = this.peekCache(job.req);
      if (hit) {
        job.opts.onInfo?.(hit);
        job.resolve(hit);
        this.pump();
        return;
      }
    }
    this.running = job;
    job.started = Date.now();
    job.lastEmit = 0;
    const { req } = job;
    const mpv = req.multipv ?? 1;
    if (mpv !== this.currentMultiPv) {
      this.transport.send(`setoption name MultiPV value ${mpv}`);
      this.currentMultiPv = mpv;
    }
    // Restaura opciones base que una búsqueda anterior pudo cambiar y aplica las específicas.
    const opts = { ...this.baseOptions, ...(req.options ?? {}) };
    for (const [k, v] of Object.entries(opts)) this.setOptionNow(k, v);
    if (req.history) {
      const mv = req.history.moves.length ? ` moves ${req.history.moves.join(' ')}` : '';
      this.transport.send(`position fen ${req.history.startFen}${mv}`);
    } else {
      this.transport.send(`position fen ${req.fen}`);
    }
    let go = 'go';
    if (req.depth) go += ` depth ${req.depth}`;
    if (req.movetime) go += ` movetime ${req.movetime}`;
    if (req.nodes) go += ` nodes ${req.nodes}`;
    if (req.searchmoves?.length) go += ` searchmoves ${req.searchmoves.join(' ')}`;
    if (go === 'go') go += ' depth 18';
    this.setStatus('thinking');
    this.transport.send(go);
    const limit = req.movetime ? req.movetime * 2 + 15000 : 180000;
    job.watchdog = setTimeout(() => this.onWatchdog(job), limit);
  }

  private onWatchdog(job: SearchJob) {
    if (this.running !== job) return;
    job.stopped = true;
    this.transport?.send('stop');
    setTimeout(() => {
      if (this.running === job) {
        // El motor no respondió ni al "stop": reiniciar.
        void this.restart().catch((e) => this.fail(e));
      }
    }, 4000);
  }

  /** Detiene la búsqueda en curso (su promesa se resuelve con el resultado parcial). */
  stop() {
    if (this.running && !this.running.stopped) {
      this.running.stopped = true;
      this.transport?.send('stop');
    }
  }

  /** Cancela las búsquedas (en cola y en curso) con una etiqueta concreta. */
  cancelTag(tag: string) {
    const keep: SearchJob[] = [];
    for (const j of this.queue) {
      if (j.opts.tag === tag) j.reject(new EngineCancelledError());
      else keep.push(j);
    }
    this.queue = keep;
    if (this.running && this.running.opts.tag === tag) {
      this.running.opts = { ...this.running.opts, tag: '__cancelled__', onInfo: undefined };
      this.stop();
    }
  }

  /** Cancela todo. */
  cancelAll() {
    for (const j of this.queue) j.reject(new EngineCancelledError());
    this.queue = [];
    if (this.running) {
      this.running.opts = { ...this.running.opts, tag: '__cancelled__', onInfo: undefined };
      this.stop();
    }
  }

  /** Informa al motor de que empieza una partida nueva (limpia la tabla hash). */
  async newGame(): Promise<void> {
    await this.init();
    this.cancelAll();
    // Esperar a que termine la búsqueda en curso para no intercalar comandos.
    for (let i = 0; i < 100 && this.running; i++) await new Promise((r) => setTimeout(r, 20));
    this.transport?.send('ucinewgame');
    await this.waitReady();
  }

  get busy(): boolean {
    return !!this.running || this.queue.length > 0;
  }

  get pending(): number {
    return this.queue.length + (this.running ? 1 : 0);
  }

  terminate() {
    this.cancelAll();
    try { this.transport?.terminate(); } catch { /* ignorado */ }
    this.transport = null;
    this.readyPromise = null;
    this.setStatus('idle');
  }
}

/** Transporte para navegador: Stockfish compilado a WASM dentro de un Web Worker. */
export function createWorkerTransport(url: string): EngineTransport {
  if (typeof Worker === 'undefined') {
    return {
      send: () => {},
      onLine: () => {},
      onError: () => {},
      terminate: () => {},
    };
  }
  const worker = new Worker(url);
  let lineCb: (l: string) => void = () => {};
  let errCb: (e: unknown) => void = () => {};
  worker.onmessage = (ev: MessageEvent) => lineCb(typeof ev.data === 'string' ? ev.data : String(ev.data));
  worker.onerror = (ev: ErrorEvent) => errCb(new Error(ev.message || 'Error en el worker de Stockfish'));
  return {
    send: (cmd) => worker.postMessage(cmd),
    onLine: (cb) => { lineCb = cb; },
    onError: (cb) => { errCb = cb; },
    terminate: () => worker.terminate(),
  };
}

