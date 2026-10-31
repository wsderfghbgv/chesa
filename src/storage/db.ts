/**
 * Almacenamiento persistente de partidas, ejercicios y perfil del jugador (Etapa 8).
 *
 * Usa IndexedDB (`idb`) en el navegador con respaldo transparente en memoria/localStorage
 * para que las pruebas automatizadas y cualquier entorno restringido funcionen igual.
 * Soporta exportación e importación en formato estándar PGN y en paquete JSON completo.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { Chess } from 'chess.js';
import { type Color, START_FEN, tryMove } from '../chess/utils';
import { detectOpening } from '../chess/openings';
import type { MoveEvaluation, MotifId } from '../coach/explain';
import { MOTIF_LABELS } from '../coach/explain';
import type { PostGameReport } from '../coach/postGame';

export type GameMode =
  | 'normal'
  | 'training_explained'
  | 'challenge'
  | 'no_aid'
  | 'find_best'
  | 'rematch';

export const GAME_MODE_LABELS: Record<GameMode, { title: string; subtitle: string }> = {
  normal: {
    title: 'Modo 1 · Partida normal',
    subtitle: 'Juega una partida completa contra el entrenador con el color y la fuerza elegidos.',
  },
  training_explained: {
    title: 'Modo 2 · Entrenamiento con explicaciones',
    subtitle: 'El profesor analiza cada jugada al instante y detiene la partida cuando hay una lección clave.',
  },
  challenge: {
    title: 'Modo 3 · Modo desafío',
    subtitle: 'Resuelve problemas tácticos y estratégicos seleccionados por el entrenador.',
  },
  no_aid: {
    title: 'Modo 4 · Entrenamiento sin ayuda',
    subtitle: 'Juega sin pistas ni barra de evaluación durante la partida; recibe el informe completo al terminar.',
  },
  find_best: {
    title: 'Modo 5 · Juega la mejor jugada',
    subtitle: 'El entrenador te plantea una posición crítica para que encuentres la mejor continuación.',
  },
  rematch: {
    title: 'Modo 6 · Revancha',
    subtitle: 'Vuelve a enfrentarte al entrenador con los mismos parámetros y compara tu rendimiento con la partida anterior.',
  },
};

export interface SavedGameRecord {
  id: string;
  createdAt: string;
  mode: GameMode;
  playerColor: Color;
  opponentLevelId: string;
  opponentLevelName: string;
  analysisDepth: number;
  startFen: string;
  uciMoves: string[];
  sanMoves: string[];
  fens: string[];
  pgn: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  outcomeForPlayer: 'win' | 'loss' | 'draw';
  reasonText: string;
  openingEco?: string;
  openingName?: string;
  accuracyPercent: number;
  averageCpLoss: number;
  avgThinkTimeMs?: number;
  evaluations: MoveEvaluation[];
  report: PostGameReport;
  rematchOfGameId?: string;
}

export interface PuzzleAttemptRecord {
  id: string;
  puzzleId: string;
  motif: MotifId;
  solved: boolean;
  attempts: number;
  timestamp: string;
}

/**
 * Ejercicio generado automáticamente a partir de un error real cometido por el jugador
 * en una de sus propias partidas («Banco de Errores Personales»).
 */
export interface PersonalMistakeRecord {
  id: string;
  gameId: string;
  createdAt: string;
  ply: number;
  moveNumber: number;
  fenBefore: string;
  playerColor: Color;
  playedUci: string;
  playedSanEs: string;
  bestUci: string;
  bestSanEs: string;
  categoryLabel: string;
  categoryColor: string;
  cpLoss: number;
  motifs: MotifId[];
  whatHappened: string;
  bestAlternativeExplain: string;
  recommendation: string;
  attemptsCount: number;
  solvedCount: number;
  mastered: boolean;
}

export interface PlayerStatsSummary {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  whiteGames: { total: number; wins: number; draws: number; losses: number; avgAccuracy: number };
  blackGames: { total: number; wins: number; draws: number; losses: number; avgAccuracy: number };
  averageAccuracy: number;
  preciseMovePercentage: number;
  averageCpLoss: number;
  avgThinkTimeMs: number | null;
  performanceHistory: Array<{
    gameId: string;
    date: string;
    accuracy: number;
    acpl: number;
    outcome: 'win' | 'loss' | 'draw';
    levelName: string;
  }>;
  frequentMistakes: Array<{ category: string; count: number }>;
  recurringTacticalIssues: Array<{
    motif: MotifId;
    label: string;
    count: number;
    isRecurring: boolean;
  }>;
  openingsUsed: Array<{ eco: string; name: string; count: number; winRate: number }>;
  puzzlesSummary: {
    totalAttempts: number;
    solvedCount: number;
    byMotif: Partial<Record<MotifId, { solved: number; total: number }>>;
  };
  recommendationsHistory: Array<{
    gameId: string;
    date: string;
    items: string[];
  }>;
  /**
   * Estimación transparente de rendimiento: null si hay menos de 5 partidas completadas
   * (no se inventa un Elo con muestras insuficientes).
   */
  estimatedPerformance: {
    available: boolean;
    minGamesRequired: number;
    gamesCount: number;
    value: number | null;
    confidenceLabel: string;
    explanation: string;
  };
}

const DB_NAME = 'chess-coach-ai-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;
const memoryGames = new Map<string, SavedGameRecord>();
const memoryPuzzles = new Map<string, PuzzleAttemptRecord>();
const memoryPersonalMistakes = new Map<string, PersonalMistakeRecord>();

async function getDb(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('games')) {
          db.createObjectStore('games', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('puzzles')) {
          db.createObjectStore('puzzles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('personal_mistakes')) {
          db.createObjectStore('personal_mistakes', { keyPath: 'id' });
        }
      },
    }).catch(() => null as unknown as IDBPDatabase);
  }
  return dbPromise;
}

/**
 * Extrae automáticamente todos los errores, errores graves, imprecisiones y oportunidades
 * perdidas del jugador en una partida y los guarda en el Banco de Errores Personales.
 */
export async function extractAndSavePersonalMistakes(record: SavedGameRecord): Promise<number> {
  let count = 0;
  const db = await getDb();
  for (const ev of record.evaluations) {
    if (ev.mover !== record.playerColor) continue;
    if (!ev.classification.meta.isMistake) continue;
    if (ev.playedUci === ev.bestUci) continue;

    const id = `mistake-${record.id}-ply-${ev.ply}`;
    const existing = memoryPersonalMistakes.get(id) ?? (db ? ((await db.get('personal_mistakes', id)) as PersonalMistakeRecord | undefined) : undefined);

    const item: PersonalMistakeRecord = {
      id,
      gameId: record.id,
      createdAt: record.createdAt,
      ply: ev.ply,
      moveNumber: ev.moveNumber,
      fenBefore: ev.fenBefore,
      playerColor: record.playerColor,
      playedUci: ev.playedUci,
      playedSanEs: ev.playedSanEs,
      bestUci: ev.bestUci,
      bestSanEs: ev.bestSanEs,
      categoryLabel: ev.classification.meta.label,
      categoryColor: ev.classification.meta.color,
      cpLoss: ev.classification.cpLoss,
      motifs: ev.motifs,
      whatHappened: ev.whatHappened,
      bestAlternativeExplain: ev.bestAlternativeExplain,
      recommendation: ev.recommendation,
      attemptsCount: existing?.attemptsCount ?? 0,
      solvedCount: existing?.solvedCount ?? 0,
      mastered: existing?.mastered ?? false,
    };

    memoryPersonalMistakes.set(id, item);
    if (db) {
      await db.put('personal_mistakes', item);
    }
    count++;
  }
  return count;
}

export async function listPersonalMistakes(): Promise<PersonalMistakeRecord[]> {
  const db = await getDb();
  if (db && db.objectStoreNames.contains('personal_mistakes')) {
    const all = (await db.getAll('personal_mistakes')) as PersonalMistakeRecord[];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.ply - b.ply);
  }
  return [...memoryPersonalMistakes.values()].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.ply - b.ply,
  );
}

export async function recordPersonalMistakeAttempt(
  mistakeId: string,
  solved: boolean,
): Promise<PersonalMistakeRecord | null> {
  const db = await getDb();
  let cur = memoryPersonalMistakes.get(mistakeId);
  if (!cur && db && db.objectStoreNames.contains('personal_mistakes')) {
    cur = (await db.get('personal_mistakes', mistakeId)) as PersonalMistakeRecord | undefined;
  }
  if (!cur) return null;

  const nextSolved = cur.solvedCount + (solved ? 1 : 0);
  const updated: PersonalMistakeRecord = {
    ...cur,
    attemptsCount: cur.attemptsCount + 1,
    solvedCount: nextSolved,
    mastered: cur.mastered || solved,
  };
  memoryPersonalMistakes.set(mistakeId, updated);
  if (db && db.objectStoreNames.contains('personal_mistakes')) {
    await db.put('personal_mistakes', updated);
  }
  return updated;
}

export async function saveGameRecord(record: SavedGameRecord): Promise<void> {
  memoryGames.set(record.id, record);
  const db = await getDb();
  if (db) {
    await db.put('games', record);
  }
  if (record.evaluations && record.evaluations.length > 0) {
    await extractAndSavePersonalMistakes(record);
  }
}

export async function listGameRecords(): Promise<SavedGameRecord[]> {
  const db = await getDb();
  if (db) {
    const all = (await db.getAll('games')) as SavedGameRecord[];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return [...memoryGames.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteGameRecord(id: string): Promise<void> {
  memoryGames.delete(id);
  const db = await getDb();
  if (db) await db.delete('games', id);
}

export async function savePuzzleAttempt(attempt: PuzzleAttemptRecord): Promise<void> {
  memoryPuzzles.set(attempt.id, attempt);
  const db = await getDb();
  if (db) await db.put('puzzles', attempt);
}

export async function listPuzzleAttempts(): Promise<PuzzleAttemptRecord[]> {
  const db = await getDb();
  if (db) {
    const all = (await db.getAll('puzzles')) as PuzzleAttemptRecord[];
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  return [...memoryPuzzles.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Genera un PGN estándar con cabeceras Seven Tag Roster y comentarios de evaluación. */
export function buildStandardPgn(params: {
  startFen: string;
  uciMoves: string[];
  playerColor: Color;
  opponentLevelName: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  dateIso?: string;
  openingName?: string;
  evaluations?: MoveEvaluation[];
}): string {
  const {
    startFen,
    uciMoves,
    playerColor,
    opponentLevelName,
    result,
    dateIso = new Date().toISOString(),
    openingName,
    evaluations = [],
  } = params;

  const chess = new Chess(startFen);
  const d = dateIso.slice(0, 10).replace(/-/g, '.');
  chess.setHeader('Event', 'Entrenamiento Chess Coach AI');
  chess.setHeader('Site', 'Chess Coach AI (Local)');
  chess.setHeader('Date', d);
  chess.setHeader('White', playerColor === 'w' ? 'Jugador' : `Stockfish (${opponentLevelName})`);
  chess.setHeader('Black', playerColor === 'b' ? 'Jugador' : `Stockfish (${opponentLevelName})`);
  chess.setHeader('Result', result);
  if (openingName) chess.setHeader('Opening', openingName);
  if (startFen !== START_FEN) {
    chess.setHeader('SetUp', '1');
    chess.setHeader('FEN', startFen);
  }

  const evalByPly = new Map<number, MoveEvaluation>();
  for (const ev of evaluations) evalByPly.set(ev.ply, ev);

  uciMoves.forEach((u, idx) => {
    const m = tryMove(chess, u);
    if (!m) return;
    const ev = evalByPly.get(idx + 1);
    if (ev && ev.mover === playerColor) {
      chess.setComment(`${ev.classification.meta.label} (mejor: ${ev.bestSanEs})`);
    }
  });

  return chess.pgn();
}

/** Calcula el resumen completo de estadísticas y progreso del jugador. */
export function computePlayerStats(
  games: SavedGameRecord[],
  puzzles: PuzzleAttemptRecord[],
): PlayerStatsSummary {
  const orderedOldestFirst = [...games].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const totalGames = games.length;
  const wins = games.filter((g) => g.outcomeForPlayer === 'win').length;
  const losses = games.filter((g) => g.outcomeForPlayer === 'loss').length;
  const draws = games.filter((g) => g.outcomeForPlayer === 'draw').length;

  const byColor = (c: Color) => {
    const list = games.filter((g) => g.playerColor === c);
    const avgAcc =
      list.length > 0
        ? Math.round(list.reduce((s, g) => s + g.accuracyPercent, 0) / list.length)
        : 0;
    return {
      total: list.length,
      wins: list.filter((g) => g.outcomeForPlayer === 'win').length,
      draws: list.filter((g) => g.outcomeForPlayer === 'draw').length,
      losses: list.filter((g) => g.outcomeForPlayer === 'loss').length,
      avgAccuracy: avgAcc,
    };
  };

  const averageAccuracy =
    totalGames > 0 ? Math.round(games.reduce((s, g) => s + g.accuracyPercent, 0) / totalGames) : 0;
  const averageCpLoss =
    totalGames > 0 ? Math.round(games.reduce((s, g) => s + g.averageCpLoss, 0) / totalGames) : 0;

  let totalPlayerMoves = 0;
  let totalPreciseMoves = 0;
  let totalThinkTimeMs = 0;
  let totalTimedMoves = 0;

  const mistakeCatMap: Record<string, number> = {
    'Imprecisión': 0,
    'Error': 0,
    'Error grave': 0,
    'Oportunidad perdida': 0,
  };
  const motifMap = new Map<MotifId, number>();
  const openingMap = new Map<string, { eco: string; name: string; count: number; wins: number }>();

  for (const g of games) {
    if (g.openingName) {
      const key = `${g.openingEco ?? '—'}|${g.openingName}`;
      const cur = openingMap.get(key) ?? { eco: g.openingEco ?? '—', name: g.openingName, count: 0, wins: 0 };
      cur.count++;
      if (g.outcomeForPlayer === 'win') cur.wins++;
      openingMap.set(key, cur);
    }
    for (const ev of g.evaluations) {
      if (ev.mover !== g.playerColor) continue;
      totalPlayerMoves++;
      if (ev.classification.meta.isPositive) totalPreciseMoves++;
      if (ev.thinkTimeMs !== undefined && ev.thinkTimeMs > 0) {
        totalThinkTimeMs += ev.thinkTimeMs;
        totalTimedMoves++;
      }
      if (ev.classification.meta.isMistake) {
        mistakeCatMap[ev.classification.meta.label] =
          (mistakeCatMap[ev.classification.meta.label] ?? 0) + 1;
        for (const m of ev.motifs) {
          motifMap.set(m, (motifMap.get(m) ?? 0) + 1);
        }
      }
    }
  }

  const preciseMovePercentage =
    totalPlayerMoves > 0 ? Math.round((totalPreciseMoves / totalPlayerMoves) * 100) : 0;

  const frequentMistakes = Object.entries(mistakeCatMap)
    .map(([category, count]) => ({ category, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const recurringTacticalIssues = [...motifMap.entries()]
    .map(([motif, count]) => ({
      motif,
      label: MOTIF_LABELS[motif],
      count,
      isRecurring: count >= 2,
    }))
    .sort((a, b) => b.count - a.count);

  const openingsUsed = [...openingMap.values()]
    .map((o) => ({
      eco: o.eco,
      name: o.name,
      count: o.count,
      winRate: Math.round((o.wins / o.count) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const byMotif: Partial<Record<MotifId, { solved: number; total: number }>> = {};
  let solvedCount = 0;
  for (const p of puzzles) {
    if (p.solved) solvedCount++;
    const cur = byMotif[p.motif] ?? { solved: 0, total: 0 };
    cur.total++;
    if (p.solved) cur.solved++;
    byMotif[p.motif] = cur;
  }

  const recommendationsHistory = games.slice(0, 10).map((g) => ({
    gameId: g.id,
    date: g.createdAt,
    items: g.report.priorityImprovements,
  }));

  // Estimación de rendimiento: solo se activa con >= 5 partidas, explicando su fórmula y límites.
  const minGamesRequired = 5;
  let estimatedPerformance: PlayerStatsSummary['estimatedPerformance'];
  if (totalGames < minGamesRequired) {
    estimatedPerformance = {
      available: false,
      minGamesRequired,
      gamesCount: totalGames,
      value: null,
      confidenceLabel: 'Muestra insuficiente',
      explanation:
        `Se requieren al menos ${minGamesRequired} partidas analizadas para calcular un índice de rendimiento estimado ` +
        `(llevas ${totalGames}). No se muestra ningún valor para evitar cifras arbitrarias sin respaldo estadístico.`,
    };
  } else {
    // Índice interno basado en ACPL y resultados frente al nivel jugado (acotado y transparente).
    const recent = games.slice(0, 15);
    const recAcpl = recent.reduce((s, g) => s + g.averageCpLoss, 0) / recent.length;
    const recScore =
      recent.reduce((s, g) => s + (g.outcomeForPlayer === 'win' ? 1 : g.outcomeForPlayer === 'draw' ? 0.5 : 0), 0) /
      recent.length;
    // Fórmula orientativa documentada: base por calidad de jugada (2100 - 11 * ACPL) + ajuste por resultados.
    const raw = Math.round(2050 - Math.min(130, recAcpl) * 10.5 + (recScore - 0.5) * 180);
    const clamped = Math.max(600, Math.min(2600, raw));
    estimatedPerformance = {
      available: true,
      minGamesRequired,
      gamesCount: totalGames,
      value: clamped,
      confidenceLabel: totalGames >= 15 ? 'Estimación consolidada' : 'Estimación preliminar',
      explanation:
        'Este índice es una ESTIMACIÓN ORIENTATIVA INTERNA calculada a partir de tu pérdida media en centipeones (ACPL) ' +
        'y tus resultados en las últimas partidas. Se actualiza con cada partida nueva y NO equivale a un Elo oficial FIDE.',
    };
  }

  return {
    totalGames,
    wins,
    losses,
    draws,
    whiteGames: byColor('w'),
    blackGames: byColor('b'),
    averageAccuracy,
    preciseMovePercentage,
    averageCpLoss,
    avgThinkTimeMs: totalTimedMoves > 0 ? Math.round(totalThinkTimeMs / totalTimedMoves) : null,
    performanceHistory: orderedOldestFirst.map((g) => ({
      gameId: g.id,
      date: g.createdAt,
      accuracy: g.accuracyPercent,
      acpl: g.averageCpLoss,
      outcome: g.outcomeForPlayer,
      levelName: g.opponentLevelName,
    })),
    frequentMistakes,
    recurringTacticalIssues,
    openingsUsed,
    puzzlesSummary: {
      totalAttempts: puzzles.length,
      solvedCount,
      byMotif,
    },
    recommendationsHistory,
    estimatedPerformance,
  };
}

/** Exporta todas las partidas en un único archivo PGN estándar. */
export async function exportAllGamesPgn(): Promise<string> {
  const games = await listGameRecords();
  return games.map((g) => g.pgn).join('\n\n');
}

/** Exporta una copia de seguridad JSON completa (partidas + ejercicios). */
export async function exportBackupJson(): Promise<string> {
  const [games, puzzles] = await Promise.all([listGameRecords(), listPuzzleAttempts()]);
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      puzzles,
    },
    null,
    2,
  );
}

/**
 * Importa partidas desde un respaldo JSON de Chess Coach AI o desde un texto PGN estándar.
 * Devuelve cuántas partidas se importaron y sus IDs.
 */
export async function importBackupOrPgn(
  rawText: string,
  playerUsernameHint?: string,
): Promise<{ importedGames: number; importedPuzzles: number; importedIds: string[] }> {
  const trimmed = rawText.trim();
  if (!trimmed) throw new Error('El archivo está vacío.');

  const importedIds: string[] = [];

  // 1) Intentar como JSON de respaldo completo.
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    let importedGames = 0;
    let importedPuzzles = 0;
    if (Array.isArray(parsed.games)) {
      for (const g of parsed.games) {
        if (g && typeof g.id === 'string' && Array.isArray(g.uciMoves)) {
          await saveGameRecord(g as SavedGameRecord);
          importedGames++;
          importedIds.push(g.id);
        }
      }
    }
    if (Array.isArray(parsed.puzzles)) {
      for (const p of parsed.puzzles) {
        if (p && typeof p.id === 'string') {
          await savePuzzleAttempt(p as PuzzleAttemptRecord);
          importedPuzzles++;
        }
      }
    }
    return { importedGames, importedPuzzles, importedIds };
  }

  // 2) Importar como PGN estándar (una o varias partidas separadas por bloques [Event ...]).
  const blocks = trimmed
    .split(/(?=\[Event\s+")/g)
    .map((b) => b.trim())
    .filter(Boolean);
  const candidates = blocks.length > 0 ? blocks : [trimmed];
  let importedGames = 0;
  const normalizedUser = playerUsernameHint?.trim().toLowerCase();

  for (const pgnBlock of candidates) {
    const chess = new Chess();
    try {
      chess.loadPgn(pgnBlock);
    } catch {
      continue;
    }
    const verbose = chess.history({ verbose: true });
    if (verbose.length === 0) continue;
    const headers = chess.getHeaders();
    const startFen = headers.FEN && headers.SetUp === '1' ? headers.FEN : START_FEN;
    const fens = [startFen, ...verbose.map((m) => m.after)];
    const uciMoves = verbose.map((m) => m.from + m.to + (m.promotion ?? ''));
    const sanMoves = verbose.map((m) => m.san);
    const op = detectOpening(fens);
    const resHeader = headers.Result;
    const result: '1-0' | '0-1' | '1/2-1/2' =
      resHeader === '1-0' || resHeader === '0-1' ? resHeader : '1/2-1/2';

    const whiteLower = (headers.White ?? '').toLowerCase();
    const blackLower = (headers.Black ?? '').toLowerCase();
    let playerColor: Color = 'w';
    if (normalizedUser) {
      if (blackLower === normalizedUser || blackLower.includes(normalizedUser)) playerColor = 'b';
      else if (whiteLower === normalizedUser || whiteLower.includes(normalizedUser)) playerColor = 'w';
    } else if (blackLower.includes('jugador')) {
      playerColor = 'b';
    }

    const outcomeForPlayer: 'win' | 'loss' | 'draw' =
      result === '1/2-1/2'
        ? 'draw'
        : (result === '1-0' && playerColor === 'w') || (result === '0-1' && playerColor === 'b')
          ? 'win'
          : 'loss';

    const opponentLabel =
      playerColor === 'w'
        ? headers.Black || 'Rival PGN'
        : headers.White || 'Rival PGN';

    const id = `pgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: SavedGameRecord = {
      id,
      createdAt: new Date().toISOString(),
      mode: 'normal',
      playerColor,
      opponentLevelId: 'importada',
      opponentLevelName: opponentLabel,
      analysisDepth: 12,
      startFen,
      uciMoves,
      sanMoves,
      fens,
      pgn: chess.pgn(),
      result,
      outcomeForPlayer,
      reasonText: 'Partida importada (pendiente o lista para análisis con Stockfish)',
      openingEco: op?.eco,
      openingName: op?.name ?? headers.Opening,
      accuracyPercent: 100,
      averageCpLoss: 0,
      evaluations: [],
      report: {
        result,
        outcomeForPlayer,
        reasonText: 'Partida importada desde PGN',
        playerColor,
        opening: op,
        totalPlies: verbose.length,
        totalFullMoves: Math.ceil(verbose.length / 2),
        playerMoveCount: verbose.filter((m) => m.color === playerColor).length,
        counts: {
          excelente: 0,
          mejor: 0,
          precisa: 0,
          buena: 0,
          oportunidad_perdida: 0,
          imprecision: 0,
          error: 0,
          error_grave: 0,
        },
        goodMovesTotal: 0,
        accuracyPercent: 100,
        averageCpLoss: 0,
        methodologyNote:
          'Partida importada en formato PGN. Pulsa «⚡ Analizar partida con Stockfish» para calcular todas las evaluaciones y el informe completo.',
        bestMoves: [],
        criticalMistakes: [],
        missedOpportunities: [],
        decisiveMoments: [],
        strategicIssues: [],
        strengths: ['Partida importada correctamente en formato PGN.'],
        priorityImprovements: [
          'Ejecuta el análisis automático con Stockfish para detectar tus mejores jugadas y errores en esta partida.',
        ],
        trainingPlan: {
          topThreeWeaknesses: [],
          conceptsToStudy: [],
          recommendedPuzzles: [],
          nextGameObjectives: [],
          verificationChallenge: {
            title: 'Posición de la partida importada',
            fromOwnGame: true,
            fen: fens[0],
            playerColor,
            solutionUci: uciMoves[0] ? [uciMoves[0]] : ['e2e4'],
            solutionSanEs: sanMoves[0] ?? 'e4',
            prompt: 'Revisa las jugadas de esta partida o analízala con Stockfish.',
            explanation: 'Puedes analizar cada movimiento con Stockfish 19.',
          },
        },
      },
    };
    await saveGameRecord(record);
    importedGames++;
    importedIds.push(id);
  }

  if (importedGames === 0) {
    throw new Error('No se encontraron partidas válidas en el texto PGN/JSON proporcionado.');
  }
  return { importedGames, importedPuzzles: 0, importedIds };
}

/**
 * Descarga las últimas partidas públicas de un usuario desde Lichess.org o Chess.com
 * y las importa automáticamente a la base de datos local.
 */
export async function fetchOnlineGames(
  platform: 'lichess' | 'chesscom',
  username: string,
  maxGames = 3,
): Promise<{ importedGames: number; importedIds: string[] }> {
  const cleanUser = username.trim();
  if (!cleanUser) {
    throw new Error('Introduce tu nombre de usuario de Lichess o Chess.com.');
  }
  const limit = Math.max(1, Math.min(10, maxGames));

  if (platform === 'lichess') {
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(cleanUser)}?max=${limit}&pgnInJson=false&clocks=false&evals=false&opening=true`;
    const res = await fetch(url, {
      headers: { Accept: 'application/x-chess-pgn' },
    });
    if (!res.ok) {
      throw new Error(
        `No se pudieron obtener partidas de Lichess para «${cleanUser}» (código HTTP ${res.status}). Verifica el nombre de usuario o tu conexión.`,
      );
    }
    const pgnText = await res.text();
    const out = await importBackupOrPgn(pgnText, cleanUser);
    return { importedGames: out.importedGames, importedIds: out.importedIds };
  } else {
    // Chess.com Public API
    const archUrl = `https://api.chess.com/pub/player/${encodeURIComponent(cleanUser.toLowerCase())}/games/archives`;
    const archRes = await fetch(archUrl);
    if (!archRes.ok) {
      throw new Error(
        `No se encontró el perfil público «${cleanUser}» en Chess.com (código HTTP ${archRes.status}).`,
      );
    }
    const archData = (await archRes.json()) as { archives?: string[] };
    const archives = archData.archives ?? [];
    if (archives.length === 0) {
      throw new Error(`El usuario «${cleanUser}» no tiene archivos de partidas públicas en Chess.com.`);
    }
    const latestArchiveUrl = archives[archives.length - 1];
    const gamesRes = await fetch(latestArchiveUrl);
    if (!gamesRes.ok) {
      throw new Error(`Error al descargar el archivo mensual de Chess.com (${gamesRes.status}).`);
    }
    const gamesData = (await gamesRes.json()) as { games?: Array<{ pgn?: string }> };
    const allPgns = (gamesData.games ?? [])
      .map((g) => g.pgn)
      .filter((p): p is string => Boolean(p && p.trim()))
      .slice(-limit)
      .reverse();

    if (allPgns.length === 0) {
      throw new Error(`No se encontraron partidas en formato PGN en el último mes de «${cleanUser}».`);
    }
    const out = await importBackupOrPgn(allPgns.join('\n\n'), cleanUser);
    return { importedGames: out.importedGames, importedIds: out.importedIds };
  }
}

