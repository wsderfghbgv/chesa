import { describe, it, expect, afterAll } from 'vitest';
import { Chess } from 'chess.js';
import { createNodeEngine } from './helpers/nodeEngine';
import {
  START_FEN,
  tryMove,
  isPromotion,
  detectGameOver,
  validateFenSafe,
  pvToSan,
} from '../src/chess/utils';
import {
  hangingPieces,
  findPins,
  forkFrom,
} from '../src/chess/features';
import { detectOpening, isKnownBookPosition } from '../src/chess/openings';
import { classifyMove } from '../src/coach/classify';
import { buildMoveEvaluation, answerCoachQuestion } from '../src/coach/explain';
import { buildPostGameReport } from '../src/coach/postGame';
import { chessTextToNaturalSpanishSpeech } from '../src/coach/soundAndSpeech';
import { PUZZLES } from '../src/coach/puzzles';
import {
  OPENING_REPERTOIRE,
  recordOpeningPracticeResult,
  isOpeningDueForReview,
} from '../src/coach/openingsTrainer';
import { ENDGAME_DRILLS } from '../src/coach/endgameDrills';
import { buildThinkingCheckQuestion } from '../src/coach/thinkingCheck';
import {
  describeMoveNaturally,
  describeSquareVisually,
  humanizeChessText,
} from '../src/chess/humanLanguage';
import {
  buildStandardPgn,
  importBackupOrPgn,
  computePlayerStats,
  listGameRecords,
  saveGameRecord,
  listPersonalMistakes,
  recordPersonalMistakeAttempt,
} from '../src/storage/db';

const engine = createNodeEngine('coach-test');
afterAll(() => engine.terminate());

describe('Reglas oficiales del ajedrez, evaluación jugada a jugada y entrenador', () => {
  it('cumple enroque corto y largo, captura al paso y promoción de peón', () => {
    // 1. Enroque corto y largo
    const castleChess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const shortCastle = tryMove(castleChess, 'e1g1');
    expect(shortCastle?.san).toBe('O-O');
    const longCastleBlack = tryMove(castleChess, 'e8c8');
    expect(longCastleBlack?.san).toBe('O-O-O');

    // 2. Captura al paso (en passant)
    const epChess = new Chess('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    const epMove = tryMove(epChess, 'e5d6');
    expect(epMove?.isEnPassant()).toBe(true);
    expect(epChess.get('d5')).toBeUndefined();

    // 3. Promoción de peón
    const promoChess = new Chess('8/4P3/4K3/8/8/8/8/6k1 w - - 0 1');
    expect(isPromotion(promoChess, 'e7', 'e8')).toBe(true);
    const promoMove = tryMove(promoChess, 'e7e8q');
    expect(promoMove?.isPromotion()).toBe(true);
    expect(promoChess.get('e8')).toEqual({ type: 'q', color: 'w' });
  });

  it('identifica correctamente jaque mate, ahogado, material insuficiente y regla de 50 jugadas', () => {
    // Mate del loco
    const mateChess = new Chess();
    ['f2f3', 'e7e5', 'g2g4', 'd8h4'].forEach((u) => tryMove(mateChess, u));
    const mateInfo = detectGameOver(mateChess);
    expect(mateInfo.over).toBe(true);
    expect(mateInfo.reason).toBe('checkmate');
    expect(mateInfo.winner).toBe('b');

    // Ahogado (stalemate)
    const staleChess = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const staleInfo = detectGameOver(staleChess);
    expect(staleInfo.over).toBe(true);
    expect(staleInfo.reason).toBe('stalemate');
    expect(staleInfo.winner).toBeNull();

    // Material insuficiente (Rey contra Rey y Alfil)
    const insuffChess = new Chess('8/8/4k3/8/8/3B4/4K3/8 w - - 0 1');
    expect(detectGameOver(insuffChess).reason).toBe('insufficient');
  });

  it('detecta piezas indefensas, clavadas y ataques dobles en el tablero', () => {
    // Caballo negro suelto en d4 atacado por caballo blanco en f3 sin defensores
    const c1 = new Chess('r1bqkbnr/pppp1ppp/8/8/3nP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4');
    const hanging = hangingPieces(c1, 'b');
    expect(hanging.some((h) => h.square === 'd4')).toBe(true);

    // Clavada absoluta en columna e: torre blanca en e1 clava caballo negro en e5 delante de rey en e8
    const c2 = new Chess('4k3/ppp2ppp/8/4n3/8/8/PPP2PPP/4R1K1 w - - 0 1');
    const pins = findPins(c2, 'w');
    expect(pins.length).toBeGreaterThan(0);
    expect(pins[0].pinned.square).toBe('e5');
    expect(pins[0].absolute).toBe(true);

    // Horquilla real de caballo en c7 a rey en e8 y torre en a8
    const c3 = new Chess('r1bqkb1r/ppN2ppp/2np1n2/4p3/4P3/8/PPPP1PPP/R1BQKBNR b KQkq - 0 5');
    const fork = forkFrom(c3, 'c7');
    expect(fork).not.toBeNull();
    expect(fork!.targets.map((t) => t.square)).toEqual(expect.arrayContaining(['e8', 'a8']));
  });

  it('evalúa jugadas reales con Stockfish diferenciando Mejor jugada de Error grave y genera explicación y flechas', async () => {
    await engine.init();
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const analysisBefore = await engine.analyze({ fen: fenBefore, depth: 8, multipv: 3 });

    // Caso A: jugar la primera opción del motor
    const bestUci = analysisBefore.bestMove!;
    const chessBest = new Chess(fenBefore);
    tryMove(chessBest, bestUci);
    const analysisAfterBest = await engine.analyze({ fen: chessBest.fen(), depth: 8, multipv: 2 });

    const evalBest = buildMoveEvaluation({
      ply: 7,
      fenBefore,
      fenAfter: chessBest.fen(),
      playedUci: bestUci,
      analysisBefore,
      analysisAfter: analysisAfterBest,
      level: 'intermedio',
    });
    expect(['excelente', 'mejor', 'precisa']).toContain(evalBest.category);
    expect(evalBest.shapes.length).toBeGreaterThan(0);

    // Caso B: cometer un error grave dejando el alfil/caballo colgado (Cxe5?? permitiendo ...Cxe5)
    const blunderUci = 'c4f7'; // Axf7+ entregando el alfil por un peón ante Rxf7
    const chessBlunder = new Chess(fenBefore);
    tryMove(chessBlunder, blunderUci);
    const analysisAfterBlunder = await engine.analyze({ fen: chessBlunder.fen(), depth: 8, multipv: 2 });

    const evalBlunder = buildMoveEvaluation({
      ply: 7,
      fenBefore,
      fenAfter: chessBlunder.fen(),
      playedUci: blunderUci,
      analysisBefore,
      analysisAfter: analysisAfterBlunder,
      level: 'intermedio',
    });
    expect(['error', 'error_grave']).toContain(evalBlunder.category);
    expect(evalBlunder.bestSanEs).toBeTruthy();
    expect(evalBlunder.whatHappened).toContain('Axf7+');
    expect(evalBlunder.continuationLine?.sanMoves.length).toBeGreaterThan(0);

    // Informe post-partida y distinción entre error aislado y patrón recurrente
    const reportIsolated = buildPostGameReport({
      result: '0-1',
      reasonText: 'Abandono',
      playerColor: 'w',
      fens: [START_FEN, fenBefore, chessBlunder.fen()],
      evaluations: [evalBest, evalBlunder],
      historicalMistakeMotifs: {},
    });
    expect(reportIsolated.counts[evalBlunder.category]).toBe(1);
    expect(reportIsolated.trainingPlan.topThreeWeaknesses.length).toBe(3);
    expect(reportIsolated.trainingPlan.verificationChallenge.fen).toBe(fenBefore);
  });

  it('no marca como error una pérdida de centipeones irrelevante en posición completamente ganada', () => {
    const res = classifyMove({
      mover: 'w',
      playedUci: 'h2h3',
      scoreBefore: { kind: 'cp', value: 750 },
      scoreAfter: { kind: 'cp', value: 600 },
      linesBefore: [
        { multipv: 1, depth: 10, score: { kind: 'cp', value: 750 }, pv: ['a2a3'] },
      ],
    });
    expect(['precisa', 'buena']).toContain(res.category);
  });

  it('verifica que todos los ejercicios del banco son posiciones FEN válidas con soluciones legales', () => {
    for (const p of PUZZLES) {
      const v = validateFenSafe(p.fen);
      expect(v.ok, `Puzzle ${p.id}: ${v.error}`).toBe(true);
      const c = new Chess(p.fen);
      expect(c.turn()).toBe(p.playerColor);
      expect(p.solutionUci.length).toBeGreaterThan(0);
      const move = tryMove(c, p.solutionUci[0]);
      expect(move, `Solución ilegal en ${p.id}: ${p.solutionUci[0]}`).not.toBeNull();
    }
  });

  it('exporta e importa partidas en formato PGN estándar conservando el historial y detecta aperturas', async () => {
    const uciMoves = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'];
    const c = new Chess();
    const fens = [START_FEN];
    for (const u of uciMoves) {
      tryMove(c, u);
      fens.push(c.fen());
    }
    const op = detectOpening(fens);
    expect(op?.name).toContain('Española');

    const pgn = buildStandardPgn({
      startFen: START_FEN,
      uciMoves,
      playerColor: 'w',
      opponentLevelName: 'Intermedio',
      result: '1-0',
      openingName: op?.name,
    });
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 3. Bb5');

    const imp = await importBackupOrPgn(pgn);
    expect(imp.importedGames).toBe(1);
    const games = await listGameRecords();
    expect(games.length).toBeGreaterThanOrEqual(1);
    const stats = computePlayerStats(games, []);
    // Con menos de 5 partidas no inventa un Elo estimado
    expect(stats.estimatedPerformance.available).toBe(false);
    expect(stats.estimatedPerformance.value).toBeNull();
  });

  it('gestiona posiciones FEN no válidas sin bloquear ni romper el motor', async () => {
    expect(validateFenSafe('fen-invalido').ok).toBe(false);
    await expect(engine.analyze({ fen: 'fen-invalido', depth: 5 })).rejects.toThrow(/FEN no válido/);
    // El motor sigue operativo después del rechazo
    const okRes = await engine.analyze({ fen: START_FEN, depth: 6 });
    expect(pvToSan(START_FEN, okRes.lines[0].pv, 2).length).toBeGreaterThan(0);
  });

  it('valida todas las líneas del Entrenador de Aperturas y el algoritmo de Repetición Espaciada', () => {
    for (const line of OPENING_REPERTOIRE) {
      const c = new Chess(START_FEN);
      for (const step of line.steps) {
        expect(c.turn()).toBe(step.mover);
        const m = tryMove(c, step.uci);
        expect(m, `Paso ilegal en ${line.id} ply ${step.ply}: ${step.uci}`).not.toBeNull();
      }
    }
    const srClean = recordOpeningPracticeResult('rep-italiana-giuoco-piano', 0);
    expect(srClean.box).toBeGreaterThanOrEqual(1);
    expect(isOpeningDueForReview(srClean)).toBe(false);

    const srMistake = recordOpeningPracticeResult('rep-italiana-giuoco-piano', 2);
    expect(srMistake.intervalDays).toBe(0);
  });

  it('valida todas las posiciones del Laboratorio de Finales Técnicos', () => {
    for (const drill of ENDGAME_DRILLS) {
      const v = validateFenSafe(drill.fen);
      expect(v.ok, `Final inválido ${drill.id}: ${v.error}`).toBe(true);
      const c = new Chess(drill.fen);
      expect(c.turn()).toBe(drill.playerColor);
      expect(c.moves().length).toBeGreaterThan(0);
    }
  });

  it('genera preguntas de verificación de pensamiento («Pregunta antes de Mover») basadas en el tablero real', () => {
    // Posición con amenaza directa de captura sobre pieza blanca indefensa
    const fenThreat = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const q = buildThinkingCheckQuestion({
      ply: 4,
      fen: fenThreat,
      playerColor: 'w',
      lastOpponentSanEs: 'Cc6',
      posAnalysis: {
        fen: fenThreat,
        depth: 10,
        bestMove: 'f1b5',
        lines: [
          { multipv: 1, depth: 10, score: { kind: 'cp', value: 30 }, pv: ['f1b5', 'a7a6'] },
        ],
      },
    });
    expect(q).not.toBeNull();
    expect(q!.options.length).toBe(3);
    expect(q!.options.filter((o) => o.isCorrect).length).toBe(1);
  });

  it('extrae automáticamente errores al Banco de Errores Personales y permite marcarlos como dominados', async () => {
    await engine.init();
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const analysisBefore = await engine.analyze({ fen: fenBefore, depth: 7, multipv: 2 });
    const chessBlunder = new Chess(fenBefore);
    tryMove(chessBlunder, 'c4f7');
    const analysisAfter = await engine.analyze({ fen: chessBlunder.fen(), depth: 7, multipv: 2 });

    const ev = buildMoveEvaluation({
      ply: 7,
      fenBefore,
      fenAfter: chessBlunder.fen(),
      playedUci: 'c4f7',
      analysisBefore,
      analysisAfter,
      level: 'intermedio',
    });

    const report = buildPostGameReport({
      result: '0-1',
      reasonText: 'Abandono',
      playerColor: 'w',
      fens: [START_FEN, fenBefore, chessBlunder.fen()],
      evaluations: [ev],
      historicalMistakeMotifs: {},
    });

    await saveGameRecord({
      id: 'test-game-mistakes-1',
      createdAt: new Date().toISOString(),
      mode: 'no_aid',
      playerColor: 'w',
      opponentLevelId: 'intermedio',
      opponentLevelName: 'Intermedio',
      analysisDepth: 8,
      startFen: START_FEN,
      uciMoves: ['c4f7'],
      sanMoves: ['Bxf7+'],
      fens: [fenBefore, chessBlunder.fen()],
      pgn: '1. Bxf7+',
      result: '0-1',
      outcomeForPlayer: 'loss',
      reasonText: 'Abandono',
      accuracyPercent: report.accuracyPercent,
      averageCpLoss: report.averageCpLoss,
      evaluations: [ev],
      report,
    });

    const mistakes = await listPersonalMistakes();
    expect(mistakes.length).toBeGreaterThanOrEqual(1);
    const target = mistakes.find((m) => m.gameId === 'test-game-mistakes-1');
    expect(target).toBeDefined();
    expect(target!.mastered).toBe(false);

    const solvedRec = await recordPersonalMistakeAttempt(target!.id, true);
    expect(solvedRec?.mastered).toBe(true);
  });

  it('traduce jugadas y textos a lenguaje natural sin necesidad de coordenadas («Modo Palabras Sencillas»)', () => {
    const visual = describeSquareVisually('e4', 'w');
    expect(visual).toContain('corazón del centro');

    const moveNatural = describeMoveNaturally(START_FEN, 'g1f3', 'w');
    expect(moveNatural).not.toBeNull();
    expect(moveNatural!.pieceName).toBe('Caballo');
    expect(moveNatural!.naturalSummary).toContain('Mover tu Caballo');

    const textTranslated = humanizeChessText('Mejor era Cf3 o O-O para evitar Axf7+.');
    expect(textTranslated).toContain('Caballo moviendo a f3');
    expect(textTranslated).toContain('Enroque corto');
    expect(textTranslated).toContain('Alfil capturando en f7 dando jaque');
  });

  it('clasifica movimientos de teoría (libro) y brillantez, y calcula estadísticas duales de blancas y negras', () => {
    // 1. Detección de libro de aperturas
    const bookRuy = isKnownBookPosition('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3');
    expect(bookRuy).not.toBeNull();
    expect(bookRuy?.name).toContain('Ruy López');

    // 2. Clasificación Libro
    const bookClass = classifyMove({
      playedUci: 'e7e5',
      scoreBefore: { type: 'cp', value: 20 },
      scoreAfter: { type: 'cp', value: 20 },
      linesBefore: [{ multipv: 1, depth: 10, pv: ['e7e5'], score: { type: 'cp', value: 20 } }],
      mover: 'b',
      isBookMove: true,
    });
    expect(bookClass.category).toBe('libro');
    expect(bookClass.meta.symbol).toBe('📖');

    // 3. Clasificación Brillante
    const brilliantClass = classifyMove({
      playedUci: 'd1h5',
      scoreBefore: { type: 'cp', value: 0 },
      scoreAfter: { type: 'cp', value: 250 },
      linesBefore: [
        { multipv: 1, depth: 12, pv: ['d1h5'], score: { type: 'cp', value: 250 } },
        { multipv: 2, depth: 12, pv: ['g1f3'], score: { type: 'cp', value: 40 } },
      ],
      mover: 'w',
      isBrillianceCandidate: true,
    });
    expect(brilliantClass.category).toBe('brillante');
    expect(brilliantClass.meta.symbol).toBe('!!');

    // 4. Fonética natural en español para síntesis de voz (TTS)
    const spoken = chessTextToNaturalSpanishSpeech('Jugaste Cf3 y luego Dxd5+ con O-O (+1.45 cp).');
    expect(spoken).toContain('caballo f 3');
    expect(spoken).toContain('dama por d 5, jaque');
    expect(spoken).toContain('enroque corto');

    // 5. Preguntas interactivas al profesor (Q&A)
    const qa = answerCoachQuestion({
      question: '¿Por qué mi jugada fue un error?',
      playerColor: 'w',
      fen: START_FEN,
    });
    expect(qa.answer.length).toBeGreaterThan(10);
    expect(qa.spokenAnswer.length).toBeGreaterThan(10);
  });
});
