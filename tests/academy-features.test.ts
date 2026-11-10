import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Chess } from 'chess.js';
import {
  OPENING_DEFS,
  compileOpening,
  getOpening,
  buildTree,
  followUci,
  orderedChildren,
  pathTo,
  mainContinuation,
  createPracticeSession,
  submitPracticeMove,
  requestPracticeHint,
  buildChallengesForOpening,
  getAllChallenges,
  getChallengesFiltered,
  evaluateChallengeAttempt,
  emptyProgress,
  markLessonCompleted,
  markMovesLearned,
  recordPracticeMove,
  recordPracticeRun,
  recordChallenge,
  recordMistake,
  recordRecall,
  dueCards,
  masteryOf,
  recommend,
  askOpeningCoach,
  detectCandidateMoveInQuestion,
  findWorstPlacedPiece,
  inspectSquareOrPiece,
  analyzeOpeningPhase,
  parseGameMovesForOpeningAnalysis,
  setEngineProvider,
  clearAcademyEngineCache,
  clearOpeningCoachCache,
} from '../src/academy';
import { OpeningsAcademyView } from '../src/components/OpeningsAcademyView';
import { App } from '../src/App';
import { useChessStore } from '../src/state/useChessStore';

// Motor determinista rápido para pruebas unitarias e integración
function installDeterministicEngine() {
  clearAcademyEngineCache();
  clearOpeningCoachCache();
  setEngineProvider(() => ({
    async analyze(opts: { fen: string; depth: number; multipv?: number; searchmoves?: string[] }) {
      const { fen, depth } = opts;
      const chess = new Chess(fen);
      const legal = chess.moves({ verbose: true });
      const priority = ['e2e4', 'd2d4', 'g1f3', 'b1c3', 'f1c4', 'f1b5', 'c7c5', 'e7e5', 'g8f6', 'b8c6', 'e7e6', 'c7c6'];
      const sorted = [...legal].sort((a, b) => {
        const ua = `${a.from}${a.to}${a.promotion ?? ''}`;
        const ub = `${b.from}${b.to}${b.promotion ?? ''}`;
        const ia = priority.indexOf(ua);
        const ib = priority.indexOf(ub);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
      const filtered = opts.searchmoves?.length
        ? sorted.filter((m) => opts.searchmoves!.includes(`${m.from}${m.to}${m.promotion ?? ''}`))
        : sorted;
      const count = Math.min(opts.multipv ?? 3, Math.max(1, filtered.length));
      const lines = [];
      for (let i = 0; i < count; i++) {
        const mv = filtered[i] ?? sorted[0];
        const uci = mv ? `${mv.from}${mv.to}${mv.promotion ?? ''}` : '';
        const isDubiousMove = uci === 'd1h5' || uci === 'd1e2' || uci === 'e2d3';
        const baseCp = isDubiousMove ? -160 : 25 - i * 20;
        lines.push({
          multipv: i + 1,
          depth,
          score: { kind: 'cp' as const, value: baseCp },
          pv: uci ? [uci] : [],
        });
      }
      return {
        fen,
        depth,
        lines,
        bestMove: lines[0]?.pv[0] ?? '(none)',
      };
    },
  }));
}

describe('Academia Inteligente de Aperturas – Funcionalidades Completas', () => {
  beforeEach(() => {
    installDeterministicEngine();
  });

  it('compila las 37 aperturas con sus 7 dimensiones pedagógicas por jugada', () => {
    const compiledList = OPENING_DEFS.map(compileOpening);
    expect(compiledList.length).toBeGreaterThanOrEqual(35);

    const italiana = getOpening('italiana')!;
    expect(italiana).toBeDefined();
    expect(italiana.eco).toContain('C50');
    const mainLine = italiana.compiled[0];
    expect(mainLine.moves.length).toBeGreaterThanOrEqual(10);

    for (const mv of mainLine.moves) {
      expect(mv.teaching.why.length).toBeGreaterThan(25);
      expect(mv.teaching.consequence.length).toBeGreaterThan(15);
      expect(mv.teaching.alternative.length).toBeGreaterThan(15);
      expect(mv.teaching.controls.length).toBeGreaterThan(10);
      expect(mv.teaching.threat.length).toBeGreaterThan(10);
      expect(mv.teaching.rival.length).toBeGreaterThan(10);
      expect(mv.teaching.arrows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('construye el árbol interactivo de variantes y navega entre línea principal y secundarias', () => {
    const espanola = compileOpening(OPENING_DEFS.find((o) => o.id === 'espanola')!);
    const tree = buildTree(espanola);

    expect(tree.byId.size).toBeGreaterThan(15);
    const { node, depth } = followUci(tree, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5']);
    expect(depth).toBe(5);
    expect(node.san).toBe('Bb5');

    // En 3.Bb5 deben existir tanto 3...a6 (Defensa Morphy) como 3...Nf6 (Defensa Berlinesa)
    const children = orderedChildren(node);
    const childSans = children.map((c) => c.san);
    expect(childSans).toContain('a6');
    expect(childSans).toContain('Nf6');

    const path = pathTo(node);
    expect(path.length).toBe(5);
    const cont = mainContinuation(node, 4);
    expect(cont.length).toBeGreaterThanOrEqual(1);
  });

  it('gestiona el Modo Práctica («Juega la Apertura») con pistas progresivas y diagnóstico de errores', () => {
    const italiana = getOpening('italiana')!;
    const session = createPracticeSession(italiana, {
      playerColor: 'w',
      difficulty: 'guiado',
    });

    expect(session.fen).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w');

    // Pedir pista nivel 1 y nivel 2 antes de jugar 1.e4
    const hintRes1 = requestPracticeHint(session, italiana);
    expect(hintRes1.hint?.level).toBe(1);
    expect(hintRes1.hint?.highlights.length).toBe(1);
    expect(hintRes1.hint?.arrows.length).toBe(0);

    const hintRes2 = requestPracticeHint(hintRes1.nextState, italiana);
    expect(hintRes2.hint?.level).toBe(2);
    expect(hintRes2.hint?.arrows.length).toBe(1);
    expect(hintRes2.hint?.arrows[0]?.orig).toBe('e2');
    expect(hintRes2.hint?.arrows[0]?.dest).toBe('e4');

    // Intentar una jugada incorrecta fuera de repertorio (1.a3)
    const wrongAttempt = submitPracticeMove(session, italiana, 'a2', 'a3');
    expect(wrongAttempt.accepted).toBe(false);
    expect(wrongAttempt.nextState.mistakesCount).toBe(1);
    expect(wrongAttempt.nextState.lastFeedback?.kind).toBe('mistake');
    expect(wrongAttempt.nextState.lastFeedback?.expectedSanEs).toBe('e4');
    expect(wrongAttempt.nextState.lastFeedback?.whyWrongOrRight.length).toBeGreaterThan(20);

    // Ahora jugar la jugada correcta 1.e4: debe aceptarla y el rival debe responder automáticamente 1...e5
    const rightAttempt = submitPracticeMove(session, italiana, 'e2', 'e4');
    expect(rightAttempt.accepted).toBe(true);
    expect(rightAttempt.nextState.uciHistory.slice(0, 2)).toEqual(['e2e4', 'e7e5']);
    expect(rightAttempt.nextState.lastFeedback?.kind).toBe('correct');
  });

  it('genera y evalúa los 8 tipos de retos requeridos en toda la biblioteca', () => {
    const allChallenges = getAllChallenges();
    const typesPresent = new Set(allChallenges.map((c) => c.type));

    expect(typesPresent.has('next-move')).toBe(true);
    expect(typesPresent.has('find-error')).toBe(true);
    expect(typesPresent.has('best-reply')).toBe(true);
    expect(typesPresent.has('trap')).toBe(true);
    expect(typesPresent.has('plan')).toBe(true);
    expect(typesPresent.has('recognize')).toBe(true);
    expect(typesPresent.has('develop')).toBe(true);
    expect(typesPresent.has('continue-line')).toBe(true);

    const sicilianaChallenges = buildChallengesForOpening(getOpening('siciliana-najdorf')!);
    expect(sicilianaChallenges.length).toBeGreaterThanOrEqual(8);

    const boardCh = sicilianaChallenges.find((c) => c.type === 'next-move')!;
    const okBoard = evaluateChallengeAttempt(boardCh, { uci: boardCh.acceptedUci![0] });
    expect(okBoard.correct).toBe(true);
    expect(okBoard.pointsAwarded).toBeGreaterThan(0);

    const quizCh = sicilianaChallenges.find((c) => c.type === 'plan')!;
    const rightOpt = quizCh.options!.find((o) => o.correct)!;
    const okQuiz = evaluateChallengeAttempt(quizCh, { optionId: rightOpt.id });
    expect(okQuiz.correct).toBe(true);

    const filtered = getChallengesFiltered({ openingId: 'italiana', type: 'trap' });
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it('calcula progreso, dominio, repetición espaciada SM-2 y recomendaciones personalizadas', () => {
    const italiana = getOpening('italiana')!;
    const mainLine = italiana.compiled[0];
    let prog = emptyProgress();

    prog = markMovesLearned(prog, 'italiana', ['root/e2e4', 'root/e2e4/e7e5']);
    prog = markLessonCompleted(prog, 'italiana', mainLine.id);
    prog = recordPracticeMove(prog, 'italiana', true);
    prog = recordPracticeRun(prog, 'italiana', mainLine.id, true);
    prog = recordChallenge(prog, 'italiana', true, 15);
    prog = recordMistake(prog, {
      openingId: 'italiana',
      fen: mainLine.fens[2],
      expectedSanEs: 'Cf3',
      playedSanEs: 'Dh5',
    });

    // Programar una tarjeta SM-2 con fallo (calidad 1 -> vence en 10 minutos)
    const now = Date.now();
    prog = recordRecall(
      prog,
      {
        openingId: 'italiana',
        lineId: mainLine.id,
        fen: mainLine.fens[2],
        expectedUci: 'g1f3',
        expectedSanEs: 'Cf3',
        color: 'w',
      },
      1,
      now,
    );

    const checkTime = now + 15 * 60_000;
    const due = dueCards(prog, checkTime);
    expect(due.length).toBe(1);
    expect(due[0]?.expectedSanEs).toBe('Cf3');

    const mastery = masteryOf(prog, 'italiana');
    expect(mastery.percent).toBeGreaterThan(0);

    const rec = recommend(prog, 'basico', checkTime);
    expect(rec.dueCount).toBe(1);
    expect(rec.headline).toContain('Italiana');
  });

  it('responde preguntas del Entrenador IA de Aperturas e inspecciona casillas y piezas con validación de motor', async () => {
    const italiana = getOpening('italiana')!;
    const mainLine = italiana.compiled[0];
    const fenAtPly2 = mainLine.fens[2]; // tras 1.e4 e5 (turno de las blancas: Qh5 es legal pero prematura)

    // Detectar jugada candidata mencionada en pregunta natural (orden: fen, question)
    const detected = detectCandidateMoveInQuestion(fenAtPly2, '¿Por qué no puedo mover la dama a h5 aquí?');
    expect(detected?.san).toBe('Qh5');

    const ans = await askOpeningCoach('¿Por qué no puedo mover la dama a h5 aquí?', {
      opening: italiana,
      line: mainLine,
      fen: fenAtPly2,
      pgn: mainLine.pgn,
      uciHistory: ['e2e4', 'e7e5'],
      ply: 2,
      userColor: 'w',
      level: 'basico',
      currentMove: mainLine.moves[1],
    });

    expect(ans.engineFact.comparedMove).toBeDefined();
    expect(ans.engineFact.comparedMove?.playedSanEs).toBe('Dh5');
    expect(ans.engineFact.scoreDescription.length).toBeGreaterThan(5);
    expect(ans.strategicExplanation.length).toBeGreaterThan(30);
    expect(ans.illustration.arrows.length).toBeGreaterThanOrEqual(1);

    // Inspector de casilla y peor pieza
    const worst = findWorstPlacedPiece(new Chess(fenAtPly2), 'w', italiana);
    expect(worst).not.toBeNull();

    const sqInfo = inspectSquareOrPiece(fenAtPly2, 'c4', italiana);
    expect(sqInfo.square).toBe('c4');
    expect(sqInfo.summary.length).toBeGreaterThan(15);
  });

  it('analiza la fase de apertura de una partida identificando apertura, salida del libro y errores de principios', async () => {
    // En 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Qe2 Nf6 5. Qd3 d6, 4.Qe2 sale del libro y mueve la dama prematuramente dos veces
    const pgnMoves = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Qe2 Nf6 5. Qd3 d6';
    const parsed = parseGameMovesForOpeningAnalysis(pgnMoves);
    expect(parsed.verboseMoves.length).toBe(10);

    const report = await analyzeOpeningPhase({
      pgnOrMoves: pgnMoves,
      playerColor: 'w',
      useEngine: true,
      engineDepth: 8,
    });

    expect(report.detectedOpening.academyOpeningId).toBe('italiana');
    expect(report.followedTheoryPlies).toBeGreaterThanOrEqual(6);
    expect(report.outOfBook).not.toBeNull();
    expect(report.outOfBook?.playedSanEs).toBe('De2');
    expect(report.violatedPrinciples.some((v) => v.title.toLowerCase().includes('dama'))).toBe(true);
    expect(report.improvementAdvice.length).toBeGreaterThanOrEqual(2);
  });

  it('renderiza OpeningsAcademyView y App con acceso a Aprender Aperturas sin errores SSR', () => {
    const academyHtml = renderToString(React.createElement(OpeningsAcademyView));
    expect(academyHtml).toContain('Apertura Italiana');
    expect(academyHtml).toContain('Profesor Virtual con Explicación por Voz');

    const appHtml = renderToString(React.createElement(App));
    expect(appHtml).toContain('Aprender Aperturas');
    expect(useChessStore.getState().setActiveTab).toBeTypeOf('function');
  });
});
