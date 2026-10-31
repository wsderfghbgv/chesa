/**
 * Estado central de Chess Coach AI (Zustand).
 *
 * Coordina:
 *  - Partida principal (reglas oficiales vía chess.js).
 *  - Dos motores Stockfish WASM en Web Workers separados (`play` para el rival y `analysis`
 *    con MultiPV para el entrenador).
 *  - Los 6 modos de juego (Partida normal, Entrenamiento con explicaciones y pausa didáctica,
 *    Modo desafío, Entrenamiento sin ayuda, Juega la mejor jugada y Revancha comparativa).
 *  - Exploración interactiva de variantes y de cualquier posición del historial sin perder el
 *    progreso de la partida activa.
 *  - Reloj opcional con incremento y registro del tiempo de reflexión por jugada.
 *  - Persistencia automática en IndexedDB al terminar cada partida o ejercicio.
 */
import { create } from 'zustand';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import {
  type Color,
  START_FEN,
  other,
  tryMove,
  parseUci,
  uciToSan,
  localizeSan,
  detectGameOver,
  resultString,
  REASON_TEXT,
  type GameOverReason,
  validateFenSafe,
} from '../chess/utils';
import { type Score } from '../engine/score';
import {
  type AnalysisResult,
  type EngineStatus,
  isCancelled,
} from '../engine/StockfishEngine';
import { getEngines } from '../engine/engines';
import { LEVELS, getLevel } from '../engine/levels';
import { chooseOpponentMove } from '../engine/opponent';
import {
  DEFAULT_THRESHOLDS,
  type ClassificationThresholds,
} from '../coach/classify';
import {
  buildMoveEvaluation,
  type ExplanationLevel,
  type MoveEvaluation,
  type MotifId,
} from '../coach/explain';
import { PUZZLES, type CoachingPuzzle } from '../coach/puzzles';
import { buildPostGameReport, type PostGameReport } from '../coach/postGame';
import {
  playChessSound,
  soundTypeForSan,
  speakCoachExplanation,
  stopCoachSpeech,
} from '../coach/soundAndSpeech';
import {
  type OpeningRepertoireLine,
  type OpeningSrState,
  loadOpeningSrMap,
  recordOpeningPracticeResult,
} from '../coach/openingsTrainer';
import {
  type EndgameDrill,
  loadCompletedEndgames,
  markEndgameCompleted,
} from '../coach/endgameDrills';
import {
  type ThinkingCheckQuestion,
  buildThinkingCheckQuestion,
} from '../coach/thinkingCheck';
import {
  type GameMode,
  type SavedGameRecord,
  type PuzzleAttemptRecord,
  type PersonalMistakeRecord,
  type PlayerStatsSummary,
  saveGameRecord,
  listGameRecords,
  deleteGameRecord,
  savePuzzleAttempt,
  listPuzzleAttempts,
  listPersonalMistakes,
  recordPersonalMistakeAttempt,
  computePlayerStats,
  buildStandardPgn,
} from '../storage/db';

export interface MoveHistoryItem {
  ply: number;
  moveNumber: number;
  color: Color;
  uci: string;
  san: string;
  sanEs: string;
  fenBefore: string;
  fenAfter: string;
  thinkTimeMs?: number;
}

export interface VariantState {
  active: boolean;
  label: string;
  originPly: number;
  originFen: string;
  uciMoves: string[];
  sanMoves: string[];
  fens: string[];
  stepIndex: number;
  analysis: AnalysisResult | null;
}

export interface ChallengeStatus {
  puzzle: CoachingPuzzle;
  attempts: number;
  status: 'pending' | 'solved' | 'failed_step';
  feedback: string | null;
  lastTriedSanEs?: string;
  engineVerification?: AnalysisResult | null;
}

export interface RematchComparison {
  previousGameId: string;
  previousResult: string;
  previousAccuracy: number;
  previousAcpl: number;
  previousBlunders: number;
}

export interface OpeningTrainerSession {
  line: OpeningRepertoireLine;
  currentStepIndex: number; // índice en `line.steps` del siguiente movimiento esperado
  mistakesInRun: number;
  completed: boolean;
  feedback: string | null;
  lastStepComment: string | null;
}

export interface ChessStoreState {
  // Tema y vista principal
  theme: 'dark' | 'light';
  activeTab: 'coach' | 'lab' | 'analysis' | 'report' | 'profile' | 'settings';

  // Configuración del motor y del entrenador
  mode: GameMode;
  playerColor: Color;
  orientation: Color;
  opponentLevelId: string;
  analysisDepth: number;
  explanationLevel: ExplanationLevel;
  thresholds: ClassificationThresholds;
  clockEnabled: boolean;
  clockInitialMinutes: number;
  clockIncrementSeconds: number;

  // Audio, Voz y «Pregunta antes de Mover»
  soundEnabled: boolean;
  voiceEnabled: boolean;
  thinkingCheckEnabled: boolean;
  activeThinkingCheck: {
    question: ThinkingCheckQuestion;
    selectedOptionId: string | null;
  } | null;

  // Entrenador de Aperturas (Repetición Espaciada) y Laboratorio de Finales
  activeOpeningTrainer: OpeningTrainerSession | null;
  openingSrMap: Record<string, OpeningSrState>;
  activeEndgameDrill: EndgameDrill | null;
  completedEndgames: Record<string, { completedAt: string; movesCount: number }>;

  // Banco de Errores Personales y Análisis en Lote
  personalMistakes: PersonalMistakeRecord[];
  activePersonalMistakeId: string | null;
  batchAnalysisProgress: {
    gameId: string;
    currentPly: number;
    totalPlies: number;
  } | null;

  // Estado de los motores
  engineStatus: EngineStatus;
  engineLabel: string;
  engineError: string | null;
  isOpponentThinking: boolean;
  isAnalyzingMove: boolean;

  // Estado de la partida principal
  startFen: string;
  fens: string[];
  moves: MoveHistoryItem[];
  /** Ply actualmente visualizado en el tablero (por defecto `moves.length`). */
  viewingPly: number;
  gameOver: boolean;
  gameOverReason?: GameOverReason;
  winner?: Color | null;
  statusBanner: string;

  // Reloj
  whiteClockMs: number;
  blackClockMs: number;
  turnStartedAt: number;

  // Evaluaciones y análisis de Stockfish por ply (de la posición ANTES de cada ply, y evaluación de cada jugada)
  posAnalysisByPly: Record<number, AnalysisResult>;
  moveEvaluations: Record<number, MoveEvaluation>;
  selectedEvalPly: number | null;
  liveEvaluation: Score | null;
  liveLines: AnalysisResult | null;

  // Pausa pedagógica en Modo 2 ("Entrenamiento con explicaciones")
  teachingPause: {
    active: boolean;
    evaluation: MoveEvaluation;
    message: string;
  } | null;

  // Exploración de variantes y modo análisis (sin perder el progreso de la partida)
  variant: VariantState | null;
  showVisualAids: boolean;
  showBestMoveArrow: boolean;
  showThreatArrows: boolean;
  simpleLanguageMode: boolean;
  showSquareLabelsOnBoard: boolean;
  focusBoardMode: boolean;
  customHighlightShapes: DrawShape[];

  // Modos 3 y 5 (Desafío / Juega la mejor jugada)
  activeChallenge: ChallengeStatus | null;
  puzzleIndex: number;

  // Modo 6 (Revancha) e informe post-partida
  postGameReport: PostGameReport | null;
  rematchComparison: RematchComparison | null;
  lastFinishedGameId: string | null;

  // Perfil e historial guardado
  savedGames: SavedGameRecord[];
  puzzleAttempts: PuzzleAttemptRecord[];
  playerStats: PlayerStatsSummary;

  // Acciones
  initApp: () => Promise<void>;
  setTheme: (t: 'dark' | 'light') => void;
  setActiveTab: (tab: ChessStoreState['activeTab']) => void;
  setMode: (mode: GameMode) => Promise<void>;
  setOpponentLevel: (id: string) => void;
  setAnalysisDepth: (depth: number) => void;
  setExplanationLevel: (lvl: ExplanationLevel) => void;
  setThresholds: (th: Partial<ClassificationThresholds>) => void;
  setClockConfig: (enabled: boolean, minutes: number, incrementSec: number) => void;
  toggleVisualOption: (opt: 'showVisualAids' | 'showBestMoveArrow' | 'showThreatArrows') => void;
  toggleSimpleLanguageMode: () => void;
  toggleSquareLabelsOnBoard: () => void;
  toggleFocusBoardMode: () => void;
  setCustomHighlightShapes: (shapes: DrawShape[]) => void;
  toggleSound: () => void;
  toggleVoice: () => void;
  toggleThinkingCheck: () => void;
  answerThinkingCheck: (optionId: string) => void;
  speakText: (text: string) => void;
  stopSpeech: () => void;
  flipBoard: () => void;

  startNewGame: (opts?: {
    mode?: GameMode;
    color?: Color;
    customFen?: string;
    rematchFromGameId?: string;
    keepEndgameDrill?: boolean;
  }) => Promise<void>;
  playUserMove: (from: Square, to: Square, promotion?: PieceSymbol) => Promise<boolean>;
  undoMovePair: () => Promise<void>;
  resignGame: () => Promise<void>;
  offerDraw: () => Promise<void>;
  finishAndReviewNow: () => Promise<void>;
  resumeFromTeachingPause: () => Promise<void>;
  retryFromTeachingPause: () => Promise<void>;

  // Entrenador de Aperturas, Finales y Banco de Errores Personales
  startOpeningDrill: (line: OpeningRepertoireLine) => Promise<void>;
  exitOpeningDrill: () => Promise<void>;
  startEndgameDrill: (drill: EndgameDrill) => Promise<void>;
  exitEndgameDrill: () => Promise<void>;
  practicePersonalMistake: (mistake: PersonalMistakeRecord) => Promise<void>;
  analyzeSavedGameWithStockfish: (gameId: string) => Promise<void>;

  // Navegación del historial y explorador de variantes
  selectPly: (ply: number) => Promise<void>;
  startVariantFromEval: (evalItem: MoveEvaluation, kind: 'best_alternative' | 'played_continuation') => Promise<void>;
  stepVariant: (delta: number) => Promise<void>;
  playFreeVariantMove: (from: Square, to: Square, promotion?: PieceSymbol) => Promise<void>;
  exitVariant: () => void;
  cancelOngoingAnalysis: () => void;
  reanalyzeCurrentPosition: (deeperDepth?: number) => Promise<void>;

  // Modos Desafío / Mejor jugada
  loadChallengePuzzle: (puzzle?: CoachingPuzzle) => Promise<void>;
  nextChallengePuzzle: () => Promise<void>;
  loadVerificationChallengeFromReport: () => Promise<void>;

  // Reloj tick
  tickClock: (now: number) => void;

  // Perfil y datos
  loadSavedGameIntoViewer: (gameId: string) => Promise<void>;
  removeSavedGame: (gameId: string) => Promise<void>;
  refreshProfileData: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'ccai_active_session_v1';

interface PersistedSessionSnapshot {
  activeTab: ChessStoreState['activeTab'];
  mode: GameMode;
  playerColor: Color;
  orientation: Color;
  opponentLevelId: string;
  analysisDepth: number;
  explanationLevel: ExplanationLevel;
  thresholds: ClassificationThresholds;
  clockEnabled: boolean;
  clockInitialMinutes: number;
  clockIncrementSeconds: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  thinkingCheckEnabled: boolean;
  activeThinkingCheck: ChessStoreState['activeThinkingCheck'];
  activeOpeningTrainer: OpeningTrainerSession | null;
  activeEndgameDrill: EndgameDrill | null;
  activePersonalMistakeId: string | null;
  startFen: string;
  fens: string[];
  moves: MoveHistoryItem[];
  viewingPly: number;
  gameOver: boolean;
  gameOverReason?: GameOverReason;
  winner?: Color | null;
  statusBanner: string;
  whiteClockMs: number;
  blackClockMs: number;
  posAnalysisByPly: Record<number, AnalysisResult>;
  moveEvaluations: Record<number, MoveEvaluation>;
  selectedEvalPly: number | null;
  liveEvaluation: ChessStoreState['liveEvaluation'];
  liveLines: AnalysisResult | null;
  teachingPause: ChessStoreState['teachingPause'];
  variant: VariantState | null;
  showVisualAids: boolean;
  showBestMoveArrow: boolean;
  showThreatArrows: boolean;
  simpleLanguageMode: boolean;
  showSquareLabelsOnBoard: boolean;
  focusBoardMode: boolean;
  activeChallenge: ChallengeStatus | null;
  puzzleIndex: number;
  postGameReport: PostGameReport | null;
  rematchComparison: RematchComparison | null;
  lastFinishedGameId: string | null;
}

export function loadPersistedSession(): Partial<PersistedSessionSnapshot> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedSessionSnapshot>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.fens) ||
      parsed.fens.length === 0 ||
      !Array.isArray(parsed.moves) ||
      parsed.fens.length !== parsed.moves.length + 1
    ) {
      return {};
    }
    const lastFen = parsed.fens[parsed.fens.length - 1];
    if (typeof lastFen !== 'string' || !validateFenSafe(lastFen).ok) {
      return {};
    }
    const viewingPly =
      typeof parsed.viewingPly === 'number'
        ? Math.max(0, Math.min(parsed.fens.length - 1, parsed.viewingPly))
        : parsed.fens.length - 1;

    return {
      ...parsed,
      viewingPly,
    };
  } catch {
    return {};
  }
}

export function savePersistedSession(state: ChessStoreState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const snapshot: PersistedSessionSnapshot = {
      activeTab: state.activeTab,
      mode: state.mode,
      playerColor: state.playerColor,
      orientation: state.orientation,
      opponentLevelId: state.opponentLevelId,
      analysisDepth: state.analysisDepth,
      explanationLevel: state.explanationLevel,
      thresholds: state.thresholds,
      clockEnabled: state.clockEnabled,
      clockInitialMinutes: state.clockInitialMinutes,
      clockIncrementSeconds: state.clockIncrementSeconds,
      soundEnabled: state.soundEnabled,
      voiceEnabled: state.voiceEnabled,
      thinkingCheckEnabled: state.thinkingCheckEnabled,
      activeThinkingCheck: state.activeThinkingCheck,
      activeOpeningTrainer: state.activeOpeningTrainer,
      activeEndgameDrill: state.activeEndgameDrill,
      activePersonalMistakeId: state.activePersonalMistakeId,
      startFen: state.startFen,
      fens: state.fens,
      moves: state.moves,
      viewingPly: state.viewingPly,
      gameOver: state.gameOver,
      gameOverReason: state.gameOverReason,
      winner: state.winner,
      statusBanner: state.statusBanner,
      whiteClockMs: state.whiteClockMs,
      blackClockMs: state.blackClockMs,
      posAnalysisByPly: state.posAnalysisByPly,
      moveEvaluations: state.moveEvaluations,
      selectedEvalPly: state.selectedEvalPly,
      liveEvaluation: state.liveEvaluation,
      liveLines: state.liveLines,
      teachingPause: state.teachingPause,
      variant: state.variant,
      showVisualAids: state.showVisualAids,
      showBestMoveArrow: state.showBestMoveArrow,
      showThreatArrows: state.showThreatArrows,
      simpleLanguageMode: state.simpleLanguageMode,
      showSquareLabelsOnBoard: state.showSquareLabelsOnBoard,
      focusBoardMode: state.focusBoardMode,
      activeChallenge: state.activeChallenge,
      puzzleIndex: state.puzzleIndex,
      postGameReport: state.postGameReport,
      rematchComparison: state.rematchComparison,
      lastFinishedGameId: state.lastFinishedGameId,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignorado si localStorage está lleno o bloqueado */
  }
}

export function clearPersistedSession(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    /* ignorado */
  }
}

const initialTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem('ccai_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignorado */ }
  return 'dark';
};

const restoredSession = loadPersistedSession();

export const useChessStore = create<ChessStoreState>((set, get) => ({
  theme: initialTheme(),
  activeTab: restoredSession.activeTab ?? 'coach',

  mode: restoredSession.mode ?? 'training_explained',
  playerColor: restoredSession.playerColor ?? 'w',
  orientation: restoredSession.orientation ?? 'w',
  opponentLevelId: restoredSession.opponentLevelId ?? LEVELS[2].id, // Intermedio por defecto
  analysisDepth: restoredSession.analysisDepth ?? 13,
  explanationLevel: restoredSession.explanationLevel ?? 'intermedio',
  thresholds: restoredSession.thresholds ?? { ...DEFAULT_THRESHOLDS },
  clockEnabled: restoredSession.clockEnabled ?? false,
  clockInitialMinutes: restoredSession.clockInitialMinutes ?? 10,
  clockIncrementSeconds: restoredSession.clockIncrementSeconds ?? 5,

  soundEnabled: restoredSession.soundEnabled ?? true,
  voiceEnabled: restoredSession.voiceEnabled ?? false,
  thinkingCheckEnabled: restoredSession.thinkingCheckEnabled ?? false,
  activeThinkingCheck: restoredSession.activeThinkingCheck ?? null,

  activeOpeningTrainer: restoredSession.activeOpeningTrainer ?? null,
  openingSrMap: loadOpeningSrMap(),
  activeEndgameDrill: restoredSession.activeEndgameDrill ?? null,
  completedEndgames: loadCompletedEndgames(),

  personalMistakes: [],
  activePersonalMistakeId: restoredSession.activePersonalMistakeId ?? null,
  batchAnalysisProgress: null,

  engineStatus: 'idle',
  engineLabel: 'Stockfish 19 WASM',
  engineError: null,
  isOpponentThinking: false,
  isAnalyzingMove: false,

  startFen: restoredSession.startFen ?? START_FEN,
  fens: restoredSession.fens ?? [START_FEN],
  moves: restoredSession.moves ?? [],
  viewingPly: restoredSession.viewingPly ?? 0,
  gameOver: restoredSession.gameOver ?? false,
  gameOverReason: restoredSession.gameOverReason,
  winner: restoredSession.winner,
  statusBanner:
    restoredSession.statusBanner ?? 'Tu turno con blancas. Mueve una pieza sobre el tablero.',

  whiteClockMs: restoredSession.whiteClockMs ?? 10 * 60 * 1000,
  blackClockMs: restoredSession.blackClockMs ?? 10 * 60 * 1000,
  turnStartedAt: Date.now(),

  posAnalysisByPly: restoredSession.posAnalysisByPly ?? {},
  moveEvaluations: restoredSession.moveEvaluations ?? {},
  selectedEvalPly: restoredSession.selectedEvalPly ?? null,
  liveEvaluation: restoredSession.liveEvaluation ?? { kind: 'cp', value: 20 },
  liveLines: restoredSession.liveLines ?? null,

  teachingPause: restoredSession.teachingPause ?? null,

  variant: restoredSession.variant ?? null,
  showVisualAids: restoredSession.showVisualAids ?? true,
  showBestMoveArrow: restoredSession.showBestMoveArrow ?? true,
  showThreatArrows: restoredSession.showThreatArrows ?? true,
  simpleLanguageMode: restoredSession.simpleLanguageMode ?? true,
  showSquareLabelsOnBoard: restoredSession.showSquareLabelsOnBoard ?? true,
  focusBoardMode: restoredSession.focusBoardMode ?? false,
  customHighlightShapes: [],

  activeChallenge: restoredSession.activeChallenge ?? null,
  puzzleIndex: restoredSession.puzzleIndex ?? 0,

  postGameReport: restoredSession.postGameReport ?? null,
  rematchComparison: restoredSession.rematchComparison ?? null,
  lastFinishedGameId: restoredSession.lastFinishedGameId ?? null,

  savedGames: [],
  puzzleAttempts: [],
  playerStats: computePlayerStats([], []),

  initApp: async () => {
    try {
      await get().refreshProfileData();
      const { play, analysis, flavor } = await getEngines(32);
      set({ engineLabel: flavor.label, engineStatus: 'loading', engineError: null });
      analysis.onStatus((s, detail) => {
        set({ engineStatus: s, engineError: s === 'error' ? detail ?? 'Error en el motor' : null });
      });
      await Promise.all([play.init(), analysis.init()]);
      set({ engineStatus: 'ready' });

      const state = get();
      const latestPly = state.moves.length;
      const latestFen = state.fens[latestPly] ?? state.startFen;

      // Si se recargó la página justo después de un movimiento del jugador aún no evaluado:
      if (
        latestPly > 0 &&
        state.moves[latestPly - 1]?.color === state.playerColor &&
        !state.moveEvaluations[latestPly] &&
        !state.activeOpeningTrainer &&
        !state.activeChallenge &&
        state.mode !== 'challenge' &&
        state.mode !== 'find_best'
      ) {
        const overInfo = detectGameOver(new Chess(latestFen));
        void evaluatePlyAndRespond(latestPly, overInfo);
        return;
      }

      // Si la partida está en curso y era turno del entrenador cuando se recargó:
      if (
        !state.gameOver &&
        !state.teachingPause?.active &&
        !state.activeOpeningTrainer &&
        !state.activeChallenge &&
        state.mode !== 'challenge' &&
        state.mode !== 'find_best'
      ) {
        const stm = new Chess(latestFen).turn();
        if (stm !== state.playerColor) {
          void triggerOpponentTurn();
          return;
        }
      }

      // Pre-analizar la posición actual si aún no está en caché
      void preAnalyzeCurrentPosition();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ engineStatus: 'error', engineError: msg });
    }
  },

  setTheme: (t) => {
    try { localStorage.setItem('ccai_theme', t); } catch { /* ignorado */ }
    set({ theme: t });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setMode: async (mode) => {
    if (mode === 'challenge' || mode === 'find_best') {
      set({ mode, activeTab: 'coach', variant: null, teachingPause: null });
      await get().loadChallengePuzzle(PUZZLES[get().puzzleIndex % PUZZLES.length]);
      return;
    }
    if (mode === 'rematch') {
      const lastId = get().lastFinishedGameId ?? get().savedGames[0]?.id;
      await get().startNewGame({ mode: 'rematch', rematchFromGameId: lastId });
      return;
    }
    await get().startNewGame({ mode });
  },

  setOpponentLevel: (id) => set({ opponentLevelId: id }),

  setAnalysisDepth: (depth) => {
    const clamped = Math.max(6, Math.min(22, depth));
    set({ analysisDepth: clamped });
  },

  setExplanationLevel: (lvl) => set({ explanationLevel: lvl }),

  setThresholds: (th) => set((s) => ({ thresholds: { ...s.thresholds, ...th } })),

  setClockConfig: (enabled, minutes, incrementSec) => {
    const ms = Math.max(1, minutes) * 60 * 1000;
    set({
      clockEnabled: enabled,
      clockInitialMinutes: Math.max(1, minutes),
      clockIncrementSeconds: Math.max(0, incrementSec),
      whiteClockMs: ms,
      blackClockMs: ms,
      turnStartedAt: Date.now(),
    });
  },

  toggleVisualOption: (opt) => set((s) => ({ [opt]: !s[opt] })),

  toggleSimpleLanguageMode: () => set((s) => ({ simpleLanguageMode: !s.simpleLanguageMode })),

  toggleSquareLabelsOnBoard: () =>
    set((s) => ({ showSquareLabelsOnBoard: !s.showSquareLabelsOnBoard })),

  toggleFocusBoardMode: () => set((s) => ({ focusBoardMode: !s.focusBoardMode })),

  setCustomHighlightShapes: (shapes) => set({ customHighlightShapes: shapes }),

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  toggleVoice: () => {
    const next = !get().voiceEnabled;
    if (!next) stopCoachSpeech();
    set({ voiceEnabled: next });
  },

  toggleThinkingCheck: () => {
    const next = !get().thinkingCheckEnabled;
    set({ thinkingCheckEnabled: next });
    if (next) {
      const s = get();
      const ply = s.moves.length;
      const lastOpp = s.moves.length > 0 && s.moves[s.moves.length - 1].color !== s.playerColor
        ? s.moves[s.moves.length - 1].sanEs
        : undefined;
      const q = buildThinkingCheckQuestion({
        ply,
        fen: s.fens[ply],
        playerColor: s.playerColor,
        lastOpponentSanEs: lastOpp,
        posAnalysis: s.posAnalysisByPly[ply],
      });
      set({ activeThinkingCheck: q ? { question: q, selectedOptionId: null } : null });
    } else {
      set({ activeThinkingCheck: null });
    }
  },

  answerThinkingCheck: (optionId) => {
    const cur = get().activeThinkingCheck;
    if (!cur) return;
    const opt = cur.question.options.find((o) => o.id === optionId);
    if (opt) {
      playChessSound(opt.isCorrect ? 'success' : 'mistake', get().soundEnabled);
    }
    set({ activeThinkingCheck: { ...cur, selectedOptionId: optionId } });
  },

  speakText: (text) => {
    speakCoachExplanation(text);
  },

  stopSpeech: () => {
    stopCoachSpeech();
  },

  flipBoard: () => set((s) => ({ orientation: other(s.orientation) })),

  startNewGame: async (opts = {}) => {
    const cur = get();
    const nextMode = opts.mode ?? (cur.mode === 'challenge' || cur.mode === 'find_best' ? 'training_explained' : cur.mode);
    let nextColor: Color = opts.color ?? cur.playerColor;
    let rematchComparison: RematchComparison | null = null;
    let nextLevelId = cur.opponentLevelId;

    if (nextMode === 'rematch' && (opts.rematchFromGameId || cur.savedGames[0])) {
      const prev = cur.savedGames.find((g) => g.id === opts.rematchFromGameId) ?? cur.savedGames[0];
      if (prev) {
        nextColor = prev.playerColor;
        nextLevelId = prev.opponentLevelId;
        rematchComparison = {
          previousGameId: prev.id,
          previousResult: prev.result,
          previousAccuracy: prev.accuracyPercent,
          previousAcpl: prev.averageCpLoss,
          previousBlunders: prev.report.counts.error_grave + prev.report.counts.error,
        };
      }
    }

    let startFen = START_FEN;
    if (opts.customFen) {
      const v = validateFenSafe(opts.customFen);
      if (v.ok) startFen = opts.customFen;
    }

    try {
      const { play, analysis } = await getEngines();
      play.cancelAll();
      analysis.cancelAll();
      void play.newGame();
      void analysis.newGame();
    } catch { /* ignorado */ }

    const initMs = cur.clockInitialMinutes * 60 * 1000;
    const stm: Color = startFen.split(' ')[1] === 'b' ? 'b' : 'w';

    set({
      mode: nextMode,
      playerColor: nextColor,
      orientation: nextColor,
      opponentLevelId: nextLevelId,
      startFen,
      fens: [startFen],
      moves: [],
      viewingPly: 0,
      gameOver: false,
      gameOverReason: undefined,
      winner: undefined,
      statusBanner:
        stm === nextColor
          ? `Tu turno (${nextColor === 'w' ? 'blancas' : 'negras'}).`
          : 'El entrenador está calculando su jugada…',
      whiteClockMs: initMs,
      blackClockMs: initMs,
      turnStartedAt: Date.now(),
      posAnalysisByPly: {},
      moveEvaluations: {},
      selectedEvalPly: null,
      liveEvaluation: { kind: 'cp', value: 20 },
      liveLines: null,
      teachingPause: null,
      variant: null,
      activeChallenge: null,
      activePersonalMistakeId: null,
      activeOpeningTrainer: null,
      activeEndgameDrill: opts.keepEndgameDrill ? cur.activeEndgameDrill : null,
      activeThinkingCheck: null,
      postGameReport: null,
      rematchComparison,
      activeTab: 'coach',
      isOpponentThinking: false,
      isAnalyzingMove: false,
    });

    // Si el usuario eligió negras (o en el FEN mueve el motor), el motor realiza la primera jugada.
    if (stm !== nextColor) {
      await triggerOpponentTurn();
    } else {
      void preAnalyzeCurrentPosition();
    }
  },

  playUserMove: async (from, to, promotion) => {
    const state = get();

    // Si está en una variante libre, redirigir la jugada al explorador de variantes.
    if (state.variant?.active) {
      await state.playFreeVariantMove(from, to, promotion);
      return true;
    }

    // Si está activo el Entrenador de Aperturas con Repetición Espaciada:
    if (state.activeOpeningTrainer && !state.activeOpeningTrainer.completed) {
      return await handleOpeningTrainerMove(from, to, promotion);
    }

    // Si estamos en Modo 3 (Desafío) o Modo 5 (Juega la mejor jugada):
    if ((state.mode === 'challenge' || state.mode === 'find_best') && state.activeChallenge) {
      return await handleChallengeMove(from, to, promotion);
    }

    if (state.gameOver || state.isOpponentThinking || state.teachingPause?.active) {
      return false;
    }

    // Si estaba viendo una jugada anterior del historial, volver primero al presente.
    const currentPly = state.moves.length;
    const fenBefore = state.fens[currentPly];
    const chess = new Chess(fenBefore);
    if (chess.turn() !== state.playerColor) return false;

    const uci = from + to + (promotion ?? '');
    const moveObj = tryMove(chess, uci);
    if (!moveObj) return false;

    playChessSound(soundTypeForSan(moveObj.san), state.soundEnabled);

    const now = Date.now();
    const thinkTimeMs = Math.max(0, now - state.turnStartedAt);
    const incMs = state.clockEnabled ? state.clockIncrementSeconds * 1000 : 0;
    const fenAfter = chess.fen();
    const newPly = currentPly + 1;
    const moveNumber = parseInt(fenBefore.split(' ')[5] ?? '1', 10) || 1;

    const item: MoveHistoryItem = {
      ply: newPly,
      moveNumber,
      color: state.playerColor,
      uci,
      san: moveObj.san,
      sanEs: localizeSan(moveObj.san, 'es'),
      fenBefore,
      fenAfter,
      thinkTimeMs,
    };

    const nextFens = [...state.fens, fenAfter];
    const nextMoves = [...state.moves, item];
    const overInfo = detectGameOver(chess);

    set((s) => ({
      fens: nextFens,
      moves: nextMoves,
      viewingPly: newPly,
      activeThinkingCheck: null,
      turnStartedAt: Date.now(),
      whiteClockMs: s.playerColor === 'w' && s.clockEnabled ? Math.max(0, s.whiteClockMs + incMs) : s.whiteClockMs,
      blackClockMs: s.playerColor === 'b' && s.clockEnabled ? Math.max(0, s.blackClockMs + incMs) : s.blackClockMs,
      statusBanner: overInfo.over
        ? overInfo.description ?? 'Partida terminada'
        : 'Analizando tu jugada y preparando respuesta…',
    }));

    // Lanzar la evaluación de la jugada del usuario en paralelo / secuencia ordenada.
    await evaluatePlyAndRespond(newPly, overInfo);
    return true;
  },

  undoMovePair: async () => {
    const state = get();
    if (state.mode === 'no_aid' && !state.gameOver) return; // En modo sin ayuda no se deshace durante la partida.
    if (state.moves.length === 0) return;

    try {
      const { play, analysis } = await getEngines();
      play.cancelTag('opponent-move');
      analysis.cancelTag('game-eval');
    } catch { /* ignorado */ }

    // Retroceder hasta el último turno del jugador.
    let targetLen = state.moves.length - 1;
    while (targetLen > 0 && state.moves[targetLen].color !== state.playerColor) {
      targetLen--;
    }

    const nextMoves = state.moves.slice(0, targetLen);
    const nextFens = state.fens.slice(0, targetLen + 1);
    const nextEvals: Record<number, MoveEvaluation> = {};
    for (const [k, v] of Object.entries(state.moveEvaluations)) {
      const p = Number(k);
      if (p <= targetLen) nextEvals[p] = v;
    }

    set({
      moves: nextMoves,
      fens: nextFens,
      viewingPly: targetLen,
      moveEvaluations: nextEvals,
      selectedEvalPly: targetLen > 0 ? targetLen : null,
      teachingPause: null,
      variant: null,
      gameOver: false,
      gameOverReason: undefined,
      winner: undefined,
      isOpponentThinking: false,
      isAnalyzingMove: false,
      postGameReport: null,
      statusBanner: 'Jugada deshecha. Es tu turno.',
      turnStartedAt: Date.now(),
    });
    void preAnalyzeCurrentPosition();
  },

  resignGame: async () => {
    const state = get();
    if (state.gameOver || state.moves.length === 0) return;
    const winner = other(state.playerColor);
    await finishGame('resign', winner, `Abandonaste la partida. Ganan las ${winner === 'w' ? 'blancas' : 'negras'}.`);
  },

  offerDraw: async () => {
    const state = get();
    if (state.gameOver || state.moves.length < 4) return;
    // El entrenador acepta tablas si la posición está equilibrada o es favorable al jugador.
    const latestScore = state.liveEvaluation;
    if (latestScore && latestScore.kind === 'cp') {
      const cpPlayer = state.playerColor === 'w' ? latestScore.value : -latestScore.value;
      if (cpPlayer >= -65) {
        await finishGame('agreement', null, REASON_TEXT.agreement);
        return;
      }
    }
    set({
      statusBanner: 'El entrenador rechaza las tablas porque tiene ventaja clara en la posición. ¡Sigue luchando!',
    });
  },

  finishAndReviewNow: async () => {
    const state = get();
    if (state.gameOver) {
      set({ activeTab: 'report' });
      return;
    }
    if (state.moves.length === 0) return;
    await finishGame(
      'agreement',
      null,
      'Sesión finalizada para revisar el resumen de la partida y lo que hiciste bien.',
    );
  },

  startOpeningDrill: async (line) => {
    const chess = new Chess(START_FEN);
    const fens: string[] = [START_FEN];
    const moves: MoveHistoryItem[] = [];
    let stepIdx = 0;
    let firstComment: string | null = null;

    // Si el jugador entrena con Negras, el entrenador ejecuta automáticamente la 1ª jugada de las Blancas.
    if (line.playerColor === 'b' && line.steps[0]?.mover === 'w') {
      const s0 = line.steps[0];
      const m0 = tryMove(chess, s0.uci);
      if (m0) {
        const fenAfter = chess.fen();
        moves.push({
          ply: 1,
          moveNumber: 1,
          color: 'w',
          uci: s0.uci,
          san: m0.san,
          sanEs: s0.sanEs,
          fenBefore: START_FEN,
          fenAfter,
        });
        fens.push(fenAfter);
        stepIdx = 1;
        firstComment = s0.comment;
      }
    }

    const nextExpected = line.steps[stepIdx];
    set({
      mode: 'training_explained',
      playerColor: line.playerColor,
      orientation: line.playerColor,
      startFen: START_FEN,
      fens,
      moves,
      viewingPly: moves.length,
      gameOver: false,
      variant: null,
      teachingPause: null,
      activeChallenge: null,
      activeEndgameDrill: null,
      activePersonalMistakeId: null,
      activeThinkingCheck: null,
      activeOpeningTrainer: {
        line,
        currentStepIndex: stepIdx,
        mistakesInRun: 0,
        completed: false,
        feedback: firstComment
          ? `Rival jugó ${line.steps[0].sanEs}: ${firstComment}`
          : `Repertorio: ${line.name}. Realiza la jugada teórica en el tablero.`,
        lastStepComment: firstComment,
      },
      activeTab: 'coach',
      statusBanner: nextExpected
        ? `Entrenador de Aperturas (${line.eco}): realiza la jugada teórica del repertorio.`
        : 'Línea completada.',
    });
  },

  exitOpeningDrill: async () => {
    set({ activeOpeningTrainer: null });
    await get().startNewGame();
  },

  startEndgameDrill: async (drill) => {
    set({
      activeEndgameDrill: drill,
      activeOpeningTrainer: null,
      activeChallenge: null,
      activePersonalMistakeId: null,
      opponentLevelId: LEVELS[7].id, // Maestro / Gran Maestro para defensa/ataque técnico preciso
    });
    await get().startNewGame({
      mode: 'training_explained',
      color: drill.playerColor,
      customFen: drill.fen,
      keepEndgameDrill: true,
    });
    set({
      statusBanner: `Laboratorio de Finales: ${drill.objectiveText}`,
      activeTab: 'coach',
    });
  },

  exitEndgameDrill: async () => {
    set({ activeEndgameDrill: null });
    await get().startNewGame();
  },

  practicePersonalMistake: async (mistake) => {
    const syntheticPuzzle: CoachingPuzzle = {
      id: mistake.id,
      title: `Tu error en jugada ${mistake.moveNumber} (jugaste ${mistake.playedSanEs})`,
      motif: mistake.motifs[0] ?? 'pieza_indefensa',
      difficulty: mistake.cpLoss >= 200 ? 'avanzado' : 'intermedio',
      fen: mistake.fenBefore,
      playerColor: mistake.playerColor,
      solutionUci: [mistake.bestUci],
      prompt: `En tu partida jugaste ${mistake.playedSanEs} (${mistake.categoryLabel}). Encuentra la mejor jugada (${mistake.bestSanEs} o equivalente según Stockfish).`,
      hint: mistake.recommendation,
      explanation: mistake.bestAlternativeExplain,
      conceptToStudy: mistake.whatHappened,
    };
    set({
      mode: 'challenge',
      activeTab: 'coach',
      activePersonalMistakeId: mistake.id,
      activeOpeningTrainer: null,
      activeEndgameDrill: null,
    });
    await get().loadChallengePuzzle(syntheticPuzzle);
  },

  analyzeSavedGameWithStockfish: async (gameId) => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game || get().batchAnalysisProgress) return;

    const totalPlies = game.uciMoves.length;
    if (totalPlies === 0) return;

    set({
      batchAnalysisProgress: { gameId, currentPly: 0, totalPlies },
      statusBanner: `Analizando partida con Stockfish 19 (0 / ${totalPlies} plies)…`,
    });

    try {
      const { analysis } = await getEngines();
      const depth = Math.min(12, Math.max(8, get().analysisDepth));
      const posCache: Record<number, AnalysisResult> = {};

      const analyzePlyFen = async (plyIndex: number): Promise<AnalysisResult> => {
        if (posCache[plyIndex]) return posCache[plyIndex];
        const res = await analysis.analyze(
          { fen: game.fens[plyIndex], depth, multipv: 3 },
          { priority: 7, tag: 'batch-import-analysis' },
        );
        posCache[plyIndex] = res;
        return res;
      };

      const evals: MoveEvaluation[] = [];
      for (let i = 0; i < totalPlies; i++) {
        const ply = i + 1;
        set({
          batchAnalysisProgress: { gameId, currentPly: ply, totalPlies },
        });
        const fenBefore = game.fens[i];
        const fenAfter = game.fens[i + 1];
        const analysisBefore = await analyzePlyFen(i);
        const analysisAfter = await analyzePlyFen(i + 1);

        const ev = buildMoveEvaluation({
          ply,
          fenBefore,
          fenAfter,
          playedUci: game.uciMoves[i],
          analysisBefore,
          analysisAfter,
          level: get().explanationLevel,
          thresholds: get().thresholds,
          fensHistory: game.fens.slice(0, ply + 1),
        });
        evals.push(ev);
      }

      const histMotifs: Partial<Record<MotifId, number>> = {};
      for (const item of get().playerStats.recurringTacticalIssues) {
        histMotifs[item.motif] = item.count;
      }

      const report = buildPostGameReport({
        result: game.result,
        reasonText: 'Partida importada y analizada íntegramente con Stockfish 19',
        playerColor: game.playerColor,
        fens: game.fens,
        evaluations: evals,
        historicalMistakeMotifs: histMotifs,
      });

      const updatedRecord: SavedGameRecord = {
        ...game,
        analysisDepth: depth,
        reasonText: 'Partida importada y analizada con Stockfish 19',
        accuracyPercent: report.accuracyPercent,
        averageCpLoss: report.averageCpLoss,
        evaluations: evals,
        report,
      };

      await saveGameRecord(updatedRecord);
      await get().refreshProfileData();
      set({ batchAnalysisProgress: null });
      await get().loadSavedGameIntoViewer(gameId);
    } catch {
      set({
        batchAnalysisProgress: null,
        statusBanner: 'El análisis en lote se interrumpió.',
      });
    }
  },

  resumeFromTeachingPause: async () => {
    const state = get();
    if (!state.teachingPause?.active) return;
    set({ teachingPause: null });
    const currentChess = new Chess(state.fens[state.fens.length - 1]);
    const overInfo = detectGameOver(currentChess);
    if (overInfo.over) {
      await finishGame(overInfo.reason!, overInfo.winner ?? null, overInfo.description!);
    } else if (currentChess.turn() !== state.playerColor) {
      await triggerOpponentTurn();
    }
  },

  retryFromTeachingPause: async () => {
    set({ teachingPause: null });
    await get().undoMovePair();
  },

  selectPly: async (ply) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.fens.length - 1, ply));
    const ev = state.moveEvaluations[clamped] ?? null;
    const cachedPos = state.posAnalysisByPly[clamped] ?? null;
    set({
      viewingPly: clamped,
      selectedEvalPly: ev ? clamped : state.selectedEvalPly,
      variant: null,
      liveEvaluation: ev?.scoreAfter ?? cachedPos?.lines[0]?.score ?? state.liveEvaluation,
      liveLines: cachedPos ?? state.liveLines,
    });
    if (!cachedPos) {
      try {
        const { analysis } = await getEngines();
        const fen = state.fens[clamped];
        const res = await analysis.analyze(
          { fen, depth: state.analysisDepth, multipv: 3 },
          { priority: 6, tag: 'history-inspect' },
        );
        set((s) => ({
          posAnalysisByPly: { ...s.posAnalysisByPly, [clamped]: res },
          liveLines: s.viewingPly === clamped ? res : s.liveLines,
          liveEvaluation: s.viewingPly === clamped ? res.lines[0]?.score ?? s.liveEvaluation : s.liveEvaluation,
        }));
      } catch { /* ignorado */ }
    }
  },

  startVariantFromEval: async (evalItem, kind) => {
    const line = kind === 'best_alternative' ? evalItem.bestLine : evalItem.continuationLine;
    const originFen = kind === 'best_alternative' ? evalItem.fenBefore : evalItem.fenAfter;
    const originPly = kind === 'best_alternative' ? evalItem.ply - 1 : evalItem.ply;
    const uciMoves = line?.uciMoves ?? (kind === 'best_alternative' ? [evalItem.bestUci] : []);
    const chess = new Chess(originFen);
    const fens = [originFen];
    const sanMoves: string[] = [];
    for (const u of uciMoves) {
      const m = tryMove(chess, u);
      if (!m) break;
      sanMoves.push(localizeSan(m.san, 'es'));
      fens.push(chess.fen());
    }
    const stepIndex = Math.min(1, fens.length - 1);
    set({
      variant: {
        active: true,
        label: kind === 'best_alternative' ? `Mejor alternativa (${evalItem.bestSanEs})` : 'Respuesta del rival',
        originPly,
        originFen,
        uciMoves: uciMoves.slice(0, sanMoves.length),
        sanMoves,
        fens,
        stepIndex,
        analysis: null,
      },
    });
    await analyzeVariantStep();
  },

  stepVariant: async (delta) => {
    const v = get().variant;
    if (!v) return;
    const nextIdx = Math.max(0, Math.min(v.fens.length - 1, v.stepIndex + delta));
    set({ variant: { ...v, stepIndex: nextIdx } });
    await analyzeVariantStep();
  },

  playFreeVariantMove: async (from, to, promotion) => {
    const state = get();
    const currentFen = state.variant
      ? state.variant.fens[state.variant.stepIndex]
      : state.fens[state.viewingPly];
    const chess = new Chess(currentFen);
    const uci = from + to + (promotion ?? '');
    const m = tryMove(chess, uci);
    if (!m) return;
    const sanEs = localizeSan(m.san, 'es');
    const nextFen = chess.fen();

    if (state.variant) {
      const baseUci = state.variant.uciMoves.slice(0, state.variant.stepIndex);
      const baseSan = state.variant.sanMoves.slice(0, state.variant.stepIndex);
      const baseFens = state.variant.fens.slice(0, state.variant.stepIndex + 1);
      set({
        variant: {
          ...state.variant,
          label: 'Exploración libre de variantes',
          uciMoves: [...baseUci, uci],
          sanMoves: [...baseSan, sanEs],
          fens: [...baseFens, nextFen],
          stepIndex: baseFens.length,
        },
      });
    } else {
      set({
        variant: {
          active: true,
          label: 'Exploración libre de variantes',
          originPly: state.viewingPly,
          originFen: currentFen,
          uciMoves: [uci],
          sanMoves: [sanEs],
          fens: [currentFen, nextFen],
          stepIndex: 1,
          analysis: null,
        },
      });
    }
    await analyzeVariantStep();
  },

  exitVariant: () => set({ variant: null }),

  cancelOngoingAnalysis: () => {
    void getEngines().then(({ analysis }) => {
      analysis.stop();
    });
    set({ isAnalyzingMove: false });
  },

  reanalyzeCurrentPosition: async (deeperDepth) => {
    const state = get();
    const depth = deeperDepth ?? Math.min(22, state.analysisDepth + 3);
    const fen = state.variant
      ? state.variant.fens[state.variant.stepIndex]
      : state.fens[state.viewingPly];
    set({ isAnalyzingMove: true });
    try {
      const { analysis } = await getEngines();
      const res = await analysis.analyze(
        { fen, depth, multipv: 3 },
        {
          priority: 9,
          tag: 'manual-deep',
          cacheable: false,
          onInfo: (partial) => {
            set({
              liveLines: partial,
              liveEvaluation: partial.lines[0]?.score ?? get().liveEvaluation,
            });
          },
        },
      );
      set((s) => ({
        isAnalyzingMove: false,
        liveLines: res,
        liveEvaluation: res.lines[0]?.score ?? s.liveEvaluation,
        posAnalysisByPly: s.variant
          ? s.posAnalysisByPly
          : { ...s.posAnalysisByPly, [s.viewingPly]: res },
      }));
    } catch (e) {
      if (!isCancelled(e)) set({ isAnalyzingMove: false });
    }
  },

  loadChallengePuzzle: async (puzzle) => {
    const puz = puzzle ?? PUZZLES[get().puzzleIndex % PUZZLES.length];
    set({
      playerColor: puz.playerColor,
      orientation: puz.playerColor,
      startFen: puz.fen,
      fens: [puz.fen],
      moves: [],
      viewingPly: 0,
      gameOver: false,
      variant: null,
      teachingPause: null,
      activeChallenge: {
        puzzle: puz,
        attempts: 0,
        status: 'pending',
        feedback: null,
        engineVerification: null,
      },
      statusBanner: puz.prompt,
    });
    try {
      const { analysis } = await getEngines();
      const res = await analysis.analyze({ fen: puz.fen, depth: get().analysisDepth, multipv: 3 }, { priority: 6 });
      set((s) => ({
        liveLines: res,
        liveEvaluation: res.lines[0]?.score ?? null,
        activeChallenge: s.activeChallenge ? { ...s.activeChallenge, engineVerification: res } : null,
      }));
    } catch { /* ignorado */ }
  },

  nextChallengePuzzle: async () => {
    const nextIdx = (get().puzzleIndex + 1) % PUZZLES.length;
    set({ puzzleIndex: nextIdx });
    await get().loadChallengePuzzle(PUZZLES[nextIdx]);
  },

  loadVerificationChallengeFromReport: async () => {
    const rep = get().postGameReport;
    if (!rep) return;
    const ch = rep.trainingPlan.verificationChallenge;
    const syntheticPuzzle: CoachingPuzzle = {
      id: `own-${Date.now()}`,
      title: ch.title,
      motif: rep.trainingPlan.topThreeWeaknesses[0]?.motif ?? 'pieza_indefensa',
      difficulty: 'intermedio',
      fen: ch.fen,
      playerColor: ch.playerColor,
      solutionUci: ch.solutionUci,
      prompt: ch.prompt,
      hint: `Piensa por qué la alternativa recomendada (${ch.solutionSanEs}) supera a la jugada de la partida.`,
      explanation: ch.explanation,
      conceptToStudy: rep.trainingPlan.conceptsToStudy[0] ?? 'Cálculo de jugadas candidatas.',
    };
    set({ mode: 'find_best', activeTab: 'coach' });
    await get().loadChallengePuzzle(syntheticPuzzle);
  },

  tickClock: (now) => {
    const s = get();
    if (!s.clockEnabled || s.gameOver || s.teachingPause?.active || s.variant?.active) return;
    if (s.mode === 'challenge' || s.mode === 'find_best' || s.moves.length === 0) {
      set({ turnStartedAt: now });
      return;
    }
    const curFen = s.fens[s.fens.length - 1];
    const stm: Color = curFen.split(' ')[1] === 'b' ? 'b' : 'w';
    const dt = Math.max(0, Math.min(1000, now - s.turnStartedAt));
    if (stm === 'w') {
      const nextW = Math.max(0, s.whiteClockMs - dt);
      set({ whiteClockMs: nextW, turnStartedAt: now });
      if (nextW === 0) void finishGame('timeout', 'b', 'Tiempo agotado para las blancas. Ganan las negras.');
    } else {
      const nextB = Math.max(0, s.blackClockMs - dt);
      set({ blackClockMs: nextB, turnStartedAt: now });
      if (nextB === 0) void finishGame('timeout', 'w', 'Tiempo agotado para las negras. Ganan las blancas.');
    }
  },

  loadSavedGameIntoViewer: async (gameId) => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game) return;
    const items: MoveHistoryItem[] = [];
    for (let i = 0; i < game.uciMoves.length; i++) {
      const fenBefore = game.fens[i];
      const fenAfter = game.fens[i + 1];
      const color: Color = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
      const moveNumber = parseInt(fenBefore.split(' ')[5] ?? '1', 10) || 1;
      const san = game.sanMoves[i] ?? uciToSan(fenBefore, game.uciMoves[i]);
      items.push({
        ply: i + 1,
        moveNumber,
        color,
        uci: game.uciMoves[i],
        san,
        sanEs: localizeSan(san, 'es'),
        fenBefore,
        fenAfter,
      });
    }
    const evalMap: Record<number, MoveEvaluation> = {};
    for (const ev of game.evaluations) evalMap[ev.ply] = ev;

    set({
      playerColor: game.playerColor,
      orientation: game.playerColor,
      startFen: game.startFen,
      fens: game.fens,
      moves: items,
      viewingPly: items.length,
      gameOver: true,
      winner: game.result === '1-0' ? 'w' : game.result === '0-1' ? 'b' : null,
      moveEvaluations: evalMap,
      selectedEvalPly: game.evaluations[game.evaluations.length - 1]?.ply ?? null,
      postGameReport: game.report,
      lastFinishedGameId: game.id,
      variant: null,
      teachingPause: null,
      activeTab: 'report',
      statusBanner: `Revisando partida guardada (${game.result} · ${game.openingName ?? 'Apertura libre'}).`,
    });
  },

  removeSavedGame: async (gameId) => {
    await deleteGameRecord(gameId);
    await get().refreshProfileData();
  },

  refreshProfileData: async () => {
    const [games, puzzles, mistakes] = await Promise.all([
      listGameRecords(),
      listPuzzleAttempts(),
      listPersonalMistakes(),
    ]);
    const stats = computePlayerStats(games, puzzles);
    set({
      savedGames: games,
      puzzleAttempts: puzzles,
      personalMistakes: mistakes,
      playerStats: stats,
      openingSrMap: loadOpeningSrMap(),
      completedEndgames: loadCompletedEndgames(),
    });
  },
}));

// Guardar automáticamente el estado de la partida y sesión activa en localStorage ante cualquier cambio
useChessStore.subscribe((state) => {
  savePersistedSession(state);
});

// --- Funciones auxiliares internas de orquestación ---

async function preAnalyzeCurrentPosition() {
  const s = useChessStore.getState();
  const ply = s.moves.length;
  let res = s.posAnalysisByPly[ply];
  if (!res) {
    try {
      const { analysis } = await getEngines();
      const fen = s.fens[ply];
      res = await analysis.analyze(
        { fen, depth: s.analysisDepth, multipv: 3 },
        {
          priority: 4,
          tag: 'game-eval',
          onInfo: (partial) => {
            const cur = useChessStore.getState();
            if (cur.viewingPly === ply && !cur.variant && cur.mode !== 'no_aid') {
              useChessStore.setState({
                liveLines: partial,
                liveEvaluation: partial.lines[0]?.score ?? cur.liveEvaluation,
              });
            }
          },
        },
      );
      useChessStore.setState((prev) => ({
        posAnalysisByPly: { ...prev.posAnalysisByPly, [ply]: res! },
        liveLines: prev.viewingPly === ply ? res! : prev.liveLines,
        liveEvaluation: prev.viewingPly === ply ? res!.lines[0]?.score ?? prev.liveEvaluation : prev.liveEvaluation,
      }));
    } catch {
      return;
    }
  }

  // Si está activa la función «Pregunta antes de Mover» y es turno del jugador:
  const latest = useChessStore.getState();
  if (
    latest.thinkingCheckEnabled &&
    latest.mode !== 'no_aid' &&
    !latest.gameOver &&
    !latest.activeOpeningTrainer &&
    !latest.activeChallenge &&
    latest.moves.length >= 2
  ) {
    const lastOpp =
      latest.moves.length > 0 && latest.moves[latest.moves.length - 1].color !== latest.playerColor
        ? latest.moves[latest.moves.length - 1].sanEs
        : undefined;
    const q = buildThinkingCheckQuestion({
      ply: latest.moves.length,
      fen: latest.fens[latest.moves.length],
      playerColor: latest.playerColor,
      lastOpponentSanEs: lastOpp,
      posAnalysis: res,
    });
    if (q) {
      useChessStore.setState({
        activeThinkingCheck: { question: q, selectedOptionId: null },
      });
    }
  }
}

async function evaluatePlyAndRespond(
  ply: number,
  overInfo: ReturnType<typeof detectGameOver>,
) {
  const s = useChessStore.getState();
  const moveItem = s.moves[ply - 1];
  if (!moveItem) return;

  useChessStore.setState({ isAnalyzingMove: true });

  // Si la partida NO ha terminado, iniciamos ya el turno del rival en su propio worker (`play`)
  // salvo en Modo 2 ("training_explained") donde primero verificamos si hay que pausar para enseñar.
  const shouldWaitBeforeOpponent = s.mode === 'training_explained' || overInfo.over;
  let opponentPromise: Promise<void> | null = null;
  if (!shouldWaitBeforeOpponent) {
    opponentPromise = triggerOpponentTurn();
  }

  try {
    const { analysis } = await getEngines();
    let analysisBefore = useChessStore.getState().posAnalysisByPly[ply - 1];
    if (!analysisBefore) {
      analysisBefore = await analysis.analyze(
        { fen: moveItem.fenBefore, depth: s.analysisDepth, multipv: 3 },
        { priority: 8, tag: 'game-eval' },
      );
    }
    const analysisAfter = await analysis.analyze(
      { fen: moveItem.fenAfter, depth: s.analysisDepth, multipv: 3 },
      {
        priority: 8,
        tag: 'game-eval',
        onInfo: (partial) => {
          const cur = useChessStore.getState();
          if (cur.mode !== 'no_aid') {
            useChessStore.setState({
              liveLines: partial,
              liveEvaluation: partial.lines[0]?.score ?? cur.liveEvaluation,
            });
          }
        },
      },
    );

    const curState = useChessStore.getState();
    const remainingClockMs =
      curState.playerColor === 'w' ? curState.whiteClockMs : curState.blackClockMs;

    const ev = buildMoveEvaluation({
      ply,
      fenBefore: moveItem.fenBefore,
      fenAfter: moveItem.fenAfter,
      playedUci: moveItem.uci,
      analysisBefore,
      analysisAfter,
      level: curState.explanationLevel,
      thresholds: curState.thresholds,
      thinkTimeMs: moveItem.thinkTimeMs,
      remainingClockMs: curState.clockEnabled ? remainingClockMs : undefined,
      fensHistory: curState.fens,
    });

    useChessStore.setState((prev) => ({
      isAnalyzingMove: false,
      posAnalysisByPly: {
        ...prev.posAnalysisByPly,
        [ply - 1]: analysisBefore,
        [ply]: analysisAfter,
      },
      moveEvaluations: { ...prev.moveEvaluations, [ply]: ev },
      selectedEvalPly: ply,
      liveLines: analysisAfter,
      liveEvaluation: analysisAfter.lines[0]?.score ?? prev.liveEvaluation,
    }));

    // Si la lectura por voz del profesor está activa y no estamos en modo sin ayuda, leer resumen breve.
    if (curState.voiceEnabled && curState.mode !== 'no_aid') {
      speakCoachExplanation(
        `${ev.playedSanEs}, ${ev.classification.meta.label}. ${ev.whatHappened}`,
      );
    }

    // Intentar enriquecer opcionalmente con el backend LLM si está configurado (sin bloquear).
    void requestOptionalLlmExplanation(ev);

    if (overInfo.over) {
      await finishGame(overInfo.reason!, overInfo.winner ?? null, overInfo.description!);
      return;
    }

    // En Modo 2 ("Entrenamiento con explicaciones"): si el jugador cometió un error, error grave
    // u oportunidad perdida, el entrenador DETIENE temporalmente la partida para enseñarle la idea.
    if (
      curState.mode === 'training_explained' &&
      (ev.category === 'error_grave' || ev.category === 'error' || ev.category === 'oportunidad_perdida')
    ) {
      playChessSound('mistake', curState.soundEnabled);
      useChessStore.setState({
        teachingPause: {
          active: true,
          evaluation: ev,
          message: `Pausa del entrenador: tu jugada ${ev.playedSanEs} fue clasificada como «${ev.classification.meta.label}». Revisa la explicación o repite la jugada antes de que el rival responda.`,
        },
        statusBanner: 'Partida en pausa pedagógica: examina la recomendación del profesor.',
      });
      return;
    }

    if (shouldWaitBeforeOpponent) {
      await triggerOpponentTurn();
    } else if (opponentPromise) {
      await opponentPromise;
    }
  } catch (e) {
    if (!isCancelled(e)) {
      useChessStore.setState({ isAnalyzingMove: false });
    }
  }
}

async function triggerOpponentTurn() {
  const s = useChessStore.getState();
  if (s.gameOver || s.teachingPause?.active) return;
  const currentPly = s.moves.length;
  const currentFen = s.fens[currentPly];
  const chess = new Chess(currentFen);
  if (chess.turn() === s.playerColor) return;

  useChessStore.setState({
    isOpponentThinking: true,
    statusBanner: `El entrenador (${getLevel(s.opponentLevelId).name}) está pensando…`,
    turnStartedAt: Date.now(),
  });

  try {
    const { play } = await getEngines();
    const level = getLevel(s.opponentLevelId);
    const oppColor = other(s.playerColor);
    const clockMs = s.clockEnabled ? (oppColor === 'w' ? s.whiteClockMs : s.blackClockMs) : undefined;
    const incrementMs = s.clockEnabled ? s.clockIncrementSeconds * 1000 : undefined;

    const choice = await chooseOpponentMove(play, level, {
      startFen: s.startFen,
      moves: s.moves.map((m) => m.uci),
      fen: currentFen,
      clockMs,
      incrementMs,
      tag: 'opponent-move',
    });

    // Verificar que la partida no haya cambiado (deshacer / reinicio) mientras pensaba.
    const latest = useChessStore.getState();
    if (latest.moves.length !== currentPly || latest.gameOver) {
      useChessStore.setState({ isOpponentThinking: false });
      return;
    }

    const moveObj = tryMove(chess, choice.uci);
    if (!moveObj) {
      useChessStore.setState({ isOpponentThinking: false });
      return;
    }

    playChessSound(soundTypeForSan(moveObj.san), latest.soundEnabled);

    const fenAfter = chess.fen();
    const newPly = currentPly + 1;
    const moveNumber = parseInt(currentFen.split(' ')[5] ?? '1', 10) || 1;
    const item: MoveHistoryItem = {
      ply: newPly,
      moveNumber,
      color: oppColor,
      uci: choice.uci,
      san: moveObj.san,
      sanEs: localizeSan(moveObj.san, 'es'),
      fenBefore: currentFen,
      fenAfter,
    };

    const overInfo = detectGameOver(chess);

    useChessStore.setState((prev) => ({
      isOpponentThinking: false,
      fens: [...prev.fens, fenAfter],
      moves: [...prev.moves, item],
      viewingPly: newPly,
      turnStartedAt: Date.now(),
      statusBanner: overInfo.over
        ? overInfo.description ?? 'Partida terminada'
        : `El entrenador jugó ${item.sanEs}${chess.inCheck() ? ' (¡Jaque!)' : ''}. Tu turno.`,
    }));

    if (overInfo.over) {
      await finishGame(overInfo.reason!, overInfo.winner ?? null, overInfo.description!);
    } else {
      void preAnalyzeCurrentPosition();
    }
  } catch (e) {
    if (!isCancelled(e)) {
      useChessStore.setState({
        isOpponentThinking: false,
        statusBanner: 'Tu turno.',
      });
    }
  }
}

async function finishGame(
  reason: GameOverReason,
  winner: Color | null,
  description: string,
) {
  const s = useChessStore.getState();
  if (s.gameOver) return;

  playChessSound('gameOver', s.soundEnabled);

  const result = resultString(winner);
  const evalsOrdered = Object.values(s.moveEvaluations).sort((a, b) => a.ply - b.ply);

  // Construir mapa histórico de motivos de error a partir de las partidas guardadas.
  const histMotifs: Partial<Record<MotifId, number>> = {};
  for (const item of s.playerStats.recurringTacticalIssues) {
    histMotifs[item.motif] = item.count;
  }

  const report = buildPostGameReport({
    result,
    reasonText: description || REASON_TEXT[reason],
    playerColor: s.playerColor,
    fens: s.fens,
    evaluations: evalsOrdered,
    historicalMistakeMotifs: histMotifs,
  });

  // Si estaba practicando un final del Laboratorio de Finales y logró el objetivo, registrarlo como superado.
  if (s.activeEndgameDrill) {
    const achieved =
      (s.activeEndgameDrill.targetOutcome === 'win' && report.outcomeForPlayer === 'win') ||
      (s.activeEndgameDrill.targetOutcome === 'draw' &&
        (report.outcomeForPlayer === 'draw' || report.outcomeForPlayer === 'win'));
    if (achieved) {
      markEndgameCompleted(s.activeEndgameDrill.id, s.moves.length);
    }
  }

  const level = getLevel(s.opponentLevelId);
  const pgn = buildStandardPgn({
    startFen: s.startFen,
    uciMoves: s.moves.map((m) => m.uci),
    playerColor: s.playerColor,
    opponentLevelName: level.name,
    result,
    openingName: report.opening?.name,
    evaluations: evalsOrdered,
  });

  const userTimed = evalsOrdered.filter((e) => e.mover === s.playerColor && e.thinkTimeMs);
  const avgThinkTimeMs =
    userTimed.length > 0
      ? Math.round(userTimed.reduce((acc, e) => acc + (e.thinkTimeMs ?? 0), 0) / userTimed.length)
      : undefined;

  const gameId = `game-${Date.now()}`;
  const record: SavedGameRecord = {
    id: gameId,
    createdAt: new Date().toISOString(),
    mode: s.mode,
    playerColor: s.playerColor,
    opponentLevelId: s.opponentLevelId,
    opponentLevelName: level.name,
    analysisDepth: s.analysisDepth,
    startFen: s.startFen,
    uciMoves: s.moves.map((m) => m.uci),
    sanMoves: s.moves.map((m) => m.san),
    fens: s.fens,
    pgn,
    result,
    outcomeForPlayer: report.outcomeForPlayer,
    reasonText: description || REASON_TEXT[reason],
    openingEco: report.opening?.eco,
    openingName: report.opening?.name,
    accuracyPercent: report.accuracyPercent,
    averageCpLoss: report.averageCpLoss,
    avgThinkTimeMs,
    evaluations: evalsOrdered,
    report,
    rematchOfGameId: s.rematchComparison?.previousGameId,
  };

  await saveGameRecord(record);
  await useChessStore.getState().refreshProfileData();

  useChessStore.setState({
    gameOver: true,
    gameOverReason: reason,
    winner,
    isOpponentThinking: false,
    activeThinkingCheck: null,
    postGameReport: report,
    lastFinishedGameId: gameId,
    statusBanner: `${description} · Precisión: ${report.accuracyPercent} %`,
    activeTab: 'report',
  });
}

async function handleOpeningTrainerMove(
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): Promise<boolean> {
  const s = useChessStore.getState();
  const sess = s.activeOpeningTrainer;
  if (!sess || sess.completed) return false;

  const expected = sess.line.steps[sess.currentStepIndex];
  if (!expected) return false;

  const currentFen = s.fens[s.fens.length - 1];
  const chess = new Chess(currentFen);
  const uci = from + to + (promotion ?? '');
  const moveObj = tryMove(chess, uci);
  if (!moveObj) return false;

  const playedSanEs = localizeSan(moveObj.san, 'es');

  if (uci !== expected.uci) {
    playChessSound('mistake', s.soundEnabled);
    const mistakes = sess.mistakesInRun + 1;
    useChessStore.setState({
      activeOpeningTrainer: {
        ...sess,
        mistakesInRun: mistakes,
        feedback: `Jugaste ${playedSanEs}, que se desvía de la línea teórica. En el repertorio «${sess.line.name}» la jugada correcta es ${expected.sanEs}: ${expected.comment}`,
      },
      statusBanner: `Desviación teórica: prueba con ${expected.sanEs}.`,
    });
    return false;
  }

  // Jugada teórica correcta del jugador
  playChessSound('success', s.soundEnabled);
  const nextFens = [...s.fens, chess.fen()];
  const nextMoves: MoveHistoryItem[] = [
    ...s.moves,
    {
      ply: s.moves.length + 1,
      moveNumber: parseInt(currentFen.split(' ')[5] ?? '1', 10) || 1,
      color: s.playerColor,
      uci,
      san: moveObj.san,
      sanEs: playedSanEs,
      fenBefore: currentFen,
      fenAfter: chess.fen(),
    },
  ];

  let nextIdx = sess.currentStepIndex + 1;
  let lastComment = `✓ ${expected.sanEs}: ${expected.comment}`;

  // Si hay respuesta teórica del rival en el árbol, ejecutarla automáticamente:
  const oppStep = sess.line.steps[nextIdx];
  if (oppStep && oppStep.mover !== s.playerColor) {
    const oppBefore = chess.fen();
    const oppMoveObj = tryMove(chess, oppStep.uci);
    if (oppMoveObj) {
      nextFens.push(chess.fen());
      nextMoves.push({
        ply: nextMoves.length + 1,
        moveNumber: parseInt(oppBefore.split(' ')[5] ?? '1', 10) || 1,
        color: oppStep.mover,
        uci: oppStep.uci,
        san: oppMoveObj.san,
        sanEs: oppStep.sanEs,
        fenBefore: oppBefore,
        fenAfter: chess.fen(),
      });
      lastComment += ` · Rival responde ${oppStep.sanEs} (${oppStep.comment})`;
      nextIdx++;
    }
  }

  const isCompleted = nextIdx >= sess.line.steps.length;
  if (isCompleted) {
    recordOpeningPracticeResult(sess.line.id, sess.mistakesInRun);
  }

  useChessStore.setState({
    fens: nextFens,
    moves: nextMoves,
    viewingPly: nextMoves.length,
    openingSrMap: loadOpeningSrMap(),
    activeOpeningTrainer: {
      ...sess,
      currentStepIndex: nextIdx,
      completed: isCompleted,
      feedback: isCompleted
        ? `🎉 ¡Línea teórica «${sess.line.name}» completada (${sess.mistakesInRun === 0 ? 'sin errores, nivel de repetición espaciada incrementado' : `${sess.mistakesInRun} fallo(s), programada para repaso hoy`})! ${lastComment}`
        : lastComment,
      lastStepComment: lastComment,
    },
    statusBanner: isCompleted
      ? `¡Apertura ${sess.line.name} completada! Puedes continuar jugando desde esta posición o elegir otra línea.`
      : `Correcto (${expected.sanEs}). Continúa con el siguiente movimiento teórico.`,
  });

  return true;
}

async function handleChallengeMove(
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): Promise<boolean> {
  const s = useChessStore.getState();
  const ch = s.activeChallenge;
  if (!ch) return false;

  const chess = new Chess(ch.puzzle.fen);
  const uci = from + to + (promotion ?? '');
  const m = tryMove(chess, uci);
  if (!m) return false;

  const sanEs = localizeSan(m.san, 'es');
  const attempts = ch.attempts + 1;

  // Comprobar si coincide con la solución definida o con la 1ª opción de Stockfish (si tiene igual evaluación).
  const engineTopUci = ch.engineVerification?.lines[0]?.pv[0];
  const isCorrect =
    ch.puzzle.solutionUci.includes(uci) ||
    (engineTopUci === uci && ch.puzzle.solutionUci.length > 0);

  if (isCorrect) {
    playChessSound('success', s.soundEnabled);
    const fenAfter = chess.fen();
    const item: MoveHistoryItem = {
      ply: 1,
      moveNumber: 1,
      color: ch.puzzle.playerColor,
      uci,
      san: m.san,
      sanEs,
      fenBefore: ch.puzzle.fen,
      fenAfter,
    };
    const attemptRec: PuzzleAttemptRecord = {
      id: `puz-att-${Date.now()}`,
      puzzleId: ch.puzzle.id,
      motif: ch.puzzle.motif,
      solved: true,
      attempts,
      timestamp: new Date().toISOString(),
    };
    await savePuzzleAttempt(attemptRec);
    if (s.activePersonalMistakeId) {
      await recordPersonalMistakeAttempt(s.activePersonalMistakeId, true);
    }
    await useChessStore.getState().refreshProfileData();

    useChessStore.setState({
      fens: [ch.puzzle.fen, fenAfter],
      moves: [item],
      viewingPly: 1,
      activeChallenge: {
        ...ch,
        attempts,
        status: 'solved',
        lastTriedSanEs: sanEs,
        feedback: `¡Correcto! ${sanEs} es la mejor jugada. ${ch.puzzle.explanation}`,
      },
      statusBanner: `¡Desafío superado con ${sanEs}!`,
    });
  } else {
    playChessSound('mistake', s.soundEnabled);
    const attemptRec: PuzzleAttemptRecord = {
      id: `puz-att-${Date.now()}`,
      puzzleId: ch.puzzle.id,
      motif: ch.puzzle.motif,
      solved: false,
      attempts,
      timestamp: new Date().toISOString(),
    };
    await savePuzzleAttempt(attemptRec);
    if (s.activePersonalMistakeId) {
      await recordPersonalMistakeAttempt(s.activePersonalMistakeId, false);
    }
    await useChessStore.getState().refreshProfileData();

    useChessStore.setState({
      activeChallenge: {
        ...ch,
        attempts,
        status: 'failed_step',
        lastTriedSanEs: sanEs,
        feedback: `${sanEs} no es la continuación más fuerte aquí. Pista: ${ch.puzzle.hint}`,
      },
      statusBanner: `Inténtalo de nuevo. Pista: ${ch.puzzle.hint}`,
    });
  }
  return true;
}

async function analyzeVariantStep() {
  const s = useChessStore.getState();
  const v = s.variant;
  if (!v) return;
  const fen = v.fens[v.stepIndex];
  try {
    const { analysis } = await getEngines();
    const res = await analysis.analyze(
      { fen, depth: Math.min(14, s.analysisDepth), multipv: 2 },
      { priority: 7, tag: 'variant-eval' },
    );
    const cur = useChessStore.getState();
    if (cur.variant && cur.variant.fens[cur.variant.stepIndex] === fen) {
      useChessStore.setState({
        variant: { ...cur.variant, analysis: res },
        liveLines: res,
        liveEvaluation: res.lines[0]?.score ?? cur.liveEvaluation,
      });
    }
  } catch { /* ignorado */ }
}

async function requestOptionalLlmExplanation(ev: MoveEvaluation) {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: useChessStore.getState().explanationLevel,
        playedSan: ev.playedSanEs,
        category: ev.classification.meta.label,
        fenBefore: ev.fenBefore,
        fenAfter: ev.fenAfter,
        scoreBefore: ev.scoreBefore,
        scoreAfter: ev.scoreAfter,
        bestSan: ev.bestSanEs,
        bestLine: ev.bestLine?.formatted ?? null,
        continuationLine: ev.continuationLine?.formatted ?? null,
        motifs: ev.motifs,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.ok && typeof data.explanation === 'string' && data.explanation.trim()) {
      useChessStore.setState((prev) => {
        const current = prev.moveEvaluations[ev.ply];
        if (!current) return prev;
        return {
          moveEvaluations: {
            ...prev.moveEvaluations,
            [ev.ply]: { ...current, llmExplanation: data.explanation.trim() },
          },
        };
      });
    }
  } catch {
    // El backend opcional de IA no está activo; el entrenador usa su explicación determinista.
  }
}

/** Calcula las formas (flechas y casillas) que deben mostrarse en el tablero actualmente. */
export function selectActiveBoardShapes(state: ChessStoreState): DrawShape[] {
  const custom = state.customHighlightShapes ?? [];
  // En modo sin ayuda solo se ocultan las ayudas DURANTE la partida; al terminar (gameOver) se desbloquean todas.
  if (!state.showVisualAids || (state.mode === 'no_aid' && !state.gameOver)) return custom;

  if (state.variant?.active) {
    const shapes: DrawShape[] = [...custom];
    const topPv = state.variant.analysis?.lines[0]?.pv[0];
    if (topPv && state.showBestMoveArrow) {
      const p = parseUci(topPv);
      shapes.push({ orig: p.from, dest: p.to, brush: 'green' });
    }
    return shapes;
  }

  if ((state.mode === 'challenge' || state.mode === 'find_best') && state.activeChallenge) {
    if (state.activeChallenge.status === 'solved') {
      const p = parseUci(state.activeChallenge.puzzle.solutionUci[0]);
      return [...custom, { orig: p.from, dest: p.to, brush: 'green' }];
    }
    return custom;
  }

  const ev = state.moveEvaluations[state.viewingPly];
  if (ev) {
    const base = ev.shapes.filter((sh) => {
      if (sh.brush === 'green' && !state.showBestMoveArrow) return false;
      if (sh.brush === 'red' && !state.showThreatArrows) return false;
      return true;
    });
    return [...base, ...custom];
  }

  // Si estamos en la posición en vivo y es el turno del jugador (sea Blancas o Negras):
  // Mostrar la flecha verde de la mejor jugada para el color que tiene el jugador.
  if (
    !state.gameOver &&
    state.moves &&
    state.viewingPly === state.moves.length &&
    state.showBestMoveArrow &&
    state.fens
  ) {
    const currentFen = state.fens[state.viewingPly] ?? state.fens[state.fens.length - 1];
    if (currentFen) {
      const chess = new Chess(currentFen);
      if (chess.turn() === state.playerColor) {
        const topPv =
          state.liveLines?.lines[0]?.pv[0] ??
          state.posAnalysisByPly?.[state.viewingPly]?.lines[0]?.pv[0];
        if (topPv) {
          const p = parseUci(topPv);
          return [...custom, { orig: p.from, dest: p.to, brush: 'green' }];
        }
      }
    }
  }

  return custom;
}

