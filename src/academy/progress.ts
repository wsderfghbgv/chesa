/**
 * Progreso, dominio y repetición espaciada de la Academia (lógica pura + persistencia).
 *
 * - Persistencia en localStorage con versión; si el contenido está corrupto se reinicia sin romper.
 * - Repetición espaciada: algoritmo SM-2 simplificado sobre «tarjetas» = (posición, jugada teórica).
 * - Dominio por apertura: combinación ponderada de cobertura, precisión, retos y madurez de tarjetas.
 */
import { OPENING_DEFS } from './library';
import { getOpening } from './lessons';
import { buildTree } from './tree';
import type { AcademyProgress, Level, MistakeRecord, OpeningProgress, ReviewCard } from './types';
import { LEVEL_ORDER } from './types';

export const PROGRESS_KEY = 'ccai_academy_progress_v1';
const DAY = 86_400_000;

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function emptyProgress(): AcademyProgress {
  return {
    version: 1,
    favorites: [],
    openings: {},
    cards: {},
    mistakes: {},
    totalSeconds: 0,
    score: 0,
    streakDays: 0,
    lastActiveDay: '',
  };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(storage: StorageLike | null = defaultStorage()): AcademyProgress {
  if (!storage) return emptyProgress();
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as AcademyProgress;
    if (!parsed || parsed.version !== 1 || typeof parsed.openings !== 'object') return emptyProgress();
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: AcademyProgress, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

function emptyOpening(openingId: string): OpeningProgress {
  return {
    openingId,
    studySeconds: 0,
    lessonsCompleted: [],
    movesLearned: [],
    practiceRuns: 0,
    practiceCorrect: 0,
    practiceTotal: 0,
    challengesDone: 0,
    challengesCorrect: 0,
    masteredLines: [],
    lastStudied: 0,
  };
}

function withOpening(p: AcademyProgress, openingId: string, now: number, fn: (o: OpeningProgress) => OpeningProgress): AcademyProgress {
  const cur = p.openings[openingId] ?? emptyOpening(openingId);
  const next = fn({ ...cur });
  next.lastStudied = now;
  const today = dayKey(now);
  let streak = p.streakDays;
  if (p.lastActiveDay !== today) {
    const yesterday = dayKey(now - DAY);
    streak = p.lastActiveDay === yesterday ? p.streakDays + 1 : 1;
  }
  return { ...p, openings: { ...p.openings, [openingId]: next }, streakDays: streak, lastActiveDay: today };
}

export function toggleFavorite(p: AcademyProgress, openingId: string): AcademyProgress {
  const has = p.favorites.includes(openingId);
  return { ...p, favorites: has ? p.favorites.filter((x) => x !== openingId) : [...p.favorites, openingId] };
}

export function addStudyTime(p: AcademyProgress, openingId: string, seconds: number, now = Date.now()): AcademyProgress {
  if (seconds <= 0) return p;
  const next = withOpening(p, openingId, now, (o) => ({ ...o, studySeconds: o.studySeconds + seconds }));
  return { ...next, totalSeconds: next.totalSeconds + seconds };
}

export function markMovesLearned(p: AcademyProgress, openingId: string, nodeKeys: string[], now = Date.now()): AcademyProgress {
  if (!nodeKeys.length) return p;
  return withOpening(p, openingId, now, (o) => ({ ...o, movesLearned: [...new Set([...o.movesLearned, ...nodeKeys])] }));
}

export function markLessonCompleted(p: AcademyProgress, openingId: string, lineId: string, now = Date.now()): AcademyProgress {
  const already = p.openings[openingId]?.lessonsCompleted.includes(lineId);
  const next = withOpening(p, openingId, now, (o) => ({ ...o, lessonsCompleted: [...new Set([...o.lessonsCompleted, lineId])] }));
  return already ? next : { ...next, score: next.score + 25 };
}

export function recordPracticeMove(
  p: AcademyProgress,
  openingId: string,
  correct: boolean,
  now = Date.now(),
): AcademyProgress {
  const next = withOpening(p, openingId, now, (o) => ({
    ...o,
    practiceTotal: o.practiceTotal + 1,
    practiceCorrect: o.practiceCorrect + (correct ? 1 : 0),
  }));
  return correct ? { ...next, score: next.score + 5 } : next;
}

export function recordPracticeRun(p: AcademyProgress, openingId: string, lineId: string | null, clean: boolean, now = Date.now()): AcademyProgress {
  const next = withOpening(p, openingId, now, (o) => ({
    ...o,
    practiceRuns: o.practiceRuns + 1,
    masteredLines: clean && lineId ? [...new Set([...o.masteredLines, lineId])] : o.masteredLines,
  }));
  return { ...next, score: next.score + (clean ? 40 : 10) };
}

export function recordChallenge(p: AcademyProgress, openingId: string, correct: boolean, points: number, now = Date.now()): AcademyProgress {
  const next = withOpening(p, openingId, now, (o) => ({
    ...o,
    challengesDone: o.challengesDone + 1,
    challengesCorrect: o.challengesCorrect + (correct ? 1 : 0),
  }));
  return { ...next, score: next.score + (correct ? points : 0) };
}

export function recordMistake(
  p: AcademyProgress,
  m: Omit<MistakeRecord, 'count' | 'last' | 'key'>,
  now = Date.now(),
): AcademyProgress {
  const key = `${m.openingId}|${m.fen.split(' ').slice(0, 4).join(' ')}|${m.expectedSanEs}`;
  const cur = p.mistakes[key];
  const rec: MistakeRecord = { ...m, key, count: (cur?.count ?? 0) + 1, last: now };
  return { ...p, mistakes: { ...p.mistakes, [key]: rec } };
}

/* ------------------------- Repetición espaciada (SM-2) ------------------------- */

export function cardId(openingId: string, fen: string): string {
  return `${openingId}|${fen.split(' ').slice(0, 4).join(' ')}`;
}

export function newCard(
  base: Pick<ReviewCard, 'openingId' | 'lineId' | 'fen' | 'expectedUci' | 'expectedSanEs' | 'color'>,
  now = Date.now(),
): ReviewCard {
  return { ...base, id: cardId(base.openingId, base.fen), ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, due: now, lastSeen: 0 };
}

/** Calidad SM-2 (0..5). ≥3 = recordada. */
export function reviewCard(card: ReviewCard, quality: number, now = Date.now()): ReviewCard {
  const q = Math.max(0, Math.min(5, quality));
  let { ease, intervalDays, repetitions, lapses } = card;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 0; // vuelve a verse hoy mismo (en 10 minutos)
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 3;
    else intervalDays = Math.round(intervalDays * ease);
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const due = q < 3 ? now + 10 * 60_000 : now + intervalDays * DAY;
  return { ...card, ease, intervalDays, repetitions, lapses, due, lastSeen: now };
}

export function upsertCard(p: AcademyProgress, card: ReviewCard): AcademyProgress {
  return { ...p, cards: { ...p.cards, [card.id]: card } };
}

/** Registra el resultado de recordar una jugada: crea la tarjeta si no existe y reprograma. */
export function recordRecall(
  p: AcademyProgress,
  base: Pick<ReviewCard, 'openingId' | 'lineId' | 'fen' | 'expectedUci' | 'expectedSanEs' | 'color'>,
  quality: number,
  now = Date.now(),
): AcademyProgress {
  const id = cardId(base.openingId, base.fen);
  const card = p.cards[id] ?? newCard(base, now);
  return upsertCard(p, reviewCard(card, quality, now));
}

export function dueCards(p: AcademyProgress, now = Date.now(), openingId?: string): ReviewCard[] {
  return Object.values(p.cards)
    .filter((c) => c.due <= now && (!openingId || c.openingId === openingId))
    .sort((a, b) => a.due - b.due);
}

/* ------------------------- Dominio y recomendaciones ------------------------- */

export interface Mastery {
  percent: number;
  label: 'Sin empezar' | 'Aprendiz' | 'Competente' | 'Sólido' | 'Maestro';
  coverage: number;
  accuracy: number | null;
  challengeAccuracy: number | null;
}

export function masteryOf(p: AcademyProgress, openingId: string): Mastery {
  const prog = p.openings[openingId];
  if (!prog) return { percent: 0, label: 'Sin empezar', coverage: 0, accuracy: null, challengeAccuracy: null };
  const opening = getOpening(openingId);
  const nodes = opening ? buildTree(opening).byId.size - 1 : 1;
  const coverage = Math.min(1, prog.movesLearned.length / Math.max(1, nodes));
  const accuracy = prog.practiceTotal > 0 ? prog.practiceCorrect / prog.practiceTotal : null;
  // La precisión pesa más cuanto más se ha practicado (evita 100% con 1 sola jugada)
  const accWeight = Math.min(1, prog.practiceTotal / 20);
  const challengeAccuracy = prog.challengesDone > 0 ? prog.challengesCorrect / prog.challengesDone : null;
  const chWeight = Math.min(1, prog.challengesDone / 6);
  const cards = Object.values(p.cards).filter((c) => c.openingId === openingId);
  const mature = cards.length ? cards.filter((c) => c.repetitions >= 3).length / cards.length : 0;
  const percent = Math.round(
    100 * (0.4 * coverage + 0.35 * (accuracy ?? 0) * accWeight + 0.15 * (challengeAccuracy ?? 0) * chWeight + 0.1 * mature),
  );
  const label: Mastery['label'] =
    percent < 5 ? 'Sin empezar' : percent < 40 ? 'Aprendiz' : percent < 65 ? 'Competente' : percent < 85 ? 'Sólido' : 'Maestro';
  return { percent, label, coverage, accuracy, challengeAccuracy };
}

export interface Recommendation {
  openingId: string | null;
  headline: string;
  reasons: string[];
  reinforce: string[];
  dueCount: number;
}

export function recommend(p: AcademyProgress, userLevel: Level, now = Date.now()): Recommendation {
  const due = dueCards(p, now);
  const reinforce: string[] = [];
  const reasons: string[] = [];
  const nameOf = (id: string) => OPENING_DEFS.find((o) => o.id === id)?.short ?? OPENING_DEFS.find((o) => o.id === id)?.name ?? id;

  const topMistakes = Object.values(p.mistakes)
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, 3);
  for (const m of topMistakes) {
    reinforce.push(`${nameOf(m.openingId)}: recuerda ${m.expectedSanEs} (fallaste ${m.count} ${m.count === 1 ? 'vez' : 'veces'}; jugaste ${m.playedSanEs}).`);
  }

  if (due.length) {
    const byOpening = new Map<string, number>();
    for (const c of due) byOpening.set(c.openingId, (byOpening.get(c.openingId) ?? 0) + 1);
    const [id, n] = [...byOpening.entries()].sort((a, b) => b[1] - a[1])[0];
    reasons.push(`Tienes ${due.length} posición(es) para repasar; ${n} son de ${nameOf(id)}.`);
    return { openingId: id, headline: `Repasa ${nameOf(id)}`, reasons, reinforce, dueCount: due.length };
  }
  if (topMistakes.length) {
    const id = topMistakes[0].openingId;
    reasons.push(`Es donde más fallos recurrentes acumulas (${topMistakes[0].count}).`);
    return { openingId: id, headline: `Refuerza ${nameOf(id)}`, reasons, reinforce, dueCount: 0 };
  }
  // Empezada pero con dominio bajo
  const started = Object.keys(p.openings)
    .map((id) => ({ id, m: masteryOf(p, id).percent }))
    .filter((x) => x.m < 85)
    .sort((a, b) => a.m - b.m);
  const fav = p.favorites.find((id) => (masteryOf(p, id).percent ?? 0) < 85);
  if (fav) {
    reasons.push('Está entre tus favoritas y aún no la dominas.');
    return { openingId: fav, headline: `Continúa con ${nameOf(fav)}`, reasons, reinforce, dueCount: 0 };
  }
  if (started.length && started[0].m < 60) {
    reasons.push(`Llevas un ${started[0].m}% de dominio: un par de sesiones más la consolidarán.`);
    return { openingId: started[0].id, headline: `Sigue con ${nameOf(started[0].id)}`, reasons, reinforce, dueCount: 0 };
  }
  // Nueva apertura adecuada al nivel, la más popular
  const candidate = OPENING_DEFS.filter((o) => !p.openings[o.id] && LEVEL_ORDER[o.level] <= LEVEL_ORDER[userLevel])
    .sort((a, b) => b.popularity - a.popularity)[0];
  if (candidate) {
    reasons.push(`Es una apertura de nivel ${candidate.level === 'basico' ? 'principiante' : candidate.level === 'intermedio' ? 'intermedio' : 'avanzado'} y muy habitual en partidas reales.`);
    return { openingId: candidate.id, headline: `Aprende ${candidate.short ?? candidate.name}`, reasons, reinforce, dueCount: 0 };
  }
  return { openingId: null, headline: 'Has recorrido todo el repertorio de tu nivel', reasons: ['Sube el nivel para descubrir aperturas más complejas.'], reinforce, dueCount: 0 };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
