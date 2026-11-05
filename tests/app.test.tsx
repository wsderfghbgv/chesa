import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { TrainingLabPanel } from '../src/components/TrainingLabPanel';
import { PostGameReportView, TruncatedExplanation } from '../src/components/PostGameReportView';
import {
  useChessStore,
  selectActiveBoardShapes,
  savePersistedSession,
  loadPersistedSession,
  clearPersistedSession,
} from '../src/state/useChessStore';
import { Chess } from 'chess.js';
import { START_FEN, getCapturedPieces } from '../src/chess/utils';
import { LEVELS } from '../src/engine/levels';

describe('App component render test', () => {
  it('initializes store without error', () => {
    const s = useChessStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.activeTab).toBe('coach');
  });

  it('selectActiveBoardShapes oculta ayudas durante partida sin ayuda pero las desbloquea al terminar (gameOver)', () => {
    const baseState = {
      ...useChessStore.getState(),
      showVisualAids: true,
      showBestMoveArrow: true,
      showThreatArrows: true,
      mode: 'no_aid' as const,
      viewingPly: 1,
      moveEvaluations: {
        1: {
          shapes: [{ orig: 'e2', dest: 'e4', brush: 'green' }],
        } as any,
      },
    };
    expect(selectActiveBoardShapes({ ...baseState, gameOver: false })).toEqual([]);
    expect(selectActiveBoardShapes({ ...baseState, gameOver: true }).length).toBe(1);
  });

  it('renders App and TrainingLabPanel to string', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Chess Coach AI');
    expect(html).toContain('Laboratorio');

    const labHtml = renderToString(<TrainingLabPanel />);
    expect(labHtml).toContain('Laboratorio de Aperturas, Errores Propios y Finales');
  });

  it('diferencia recomendaciones y flechas según si el jugador tiene blancas o negras en su turno', () => {
    // Cuando el usuario juega con negras y el rival acaba de jugar 1. e4:
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const blackState = {
      ...useChessStore.getState(),
      playerColor: 'b' as const,
      orientation: 'b' as const,
      showVisualAids: true,
      showBestMoveArrow: true,
      mode: 'normal' as const,
      gameOver: false,
      moves: [
        {
          ply: 1,
          moveNumber: 1,
          color: 'w' as const,
          uci: 'e2e4',
          san: 'e4',
          sanEs: 'e4',
          fenBefore: START_FEN,
          fenAfter: fenAfterE4,
        },
      ],
      fens: [START_FEN, fenAfterE4],
      viewingPly: 1,
      moveEvaluations: {},
      liveLines: {
        depth: 14,
        fen: fenAfterE4,
        lines: [
          {
            multipv: 1,
            score: { kind: 'cp' as const, value: 25 },
            depth: 14,
            pv: ['c7c5', 'g1f3', 'd7d6'],
          },
        ],
      },
    };

    const shapes = selectActiveBoardShapes(blackState as any);
    // Debe recomendar la jugada de las NEGRAS (c7 -> c5), NO una jugada blanca
    expect(shapes.length).toBe(1);
    expect(shapes[0].orig).toBe('c7');
    expect(shapes[0].dest).toBe('c5');
    expect(shapes[0].brush).toBe('green');
  });

  it('persiste y restaura la partida y el progreso en curso al recargar la página (localStorage)', () => {
    const storageMap = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => { storageMap.set(k, v); },
      removeItem: (k: string) => { storageMap.delete(k); },
    };
    const prevStorage = (globalThis as any).localStorage;
    (globalThis as any).localStorage = fakeStorage;

    try {
      const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const customState = {
        ...useChessStore.getState(),
        activeTab: 'coach' as const,
        mode: 'no_aid' as const,
        fens: [START_FEN, fenAfterE4],
        moves: [
          {
            ply: 1,
            moveNumber: 1,
            color: 'w' as const,
            uci: 'e2e4',
            san: 'e4',
            sanEs: 'e4',
            fenBefore: START_FEN,
            fenAfter: fenAfterE4,
          },
        ],
        viewingPly: 1,
        statusBanner: 'El entrenador está pensando…',
      };

      savePersistedSession(customState);
      const restored = loadPersistedSession();

      expect(restored.mode).toBe('no_aid');
      expect(restored.fens).toEqual([START_FEN, fenAfterE4]);
      expect(restored.moves?.length).toBe(1);
      expect(restored.moves?.[0].uci).toBe('e2e4');
      expect(restored.viewingPly).toBe(1);

      clearPersistedSession();
      expect(loadPersistedSession()).toEqual({});
    } finally {
      (globalThis as any).localStorage = prevStorage;
    }
  });

  it('detiene la reproducción automática al solicitar stopAutoPlay o al interactuar con el tablero', () => {
    useChessStore.setState({ isAutoPlaying: true });
    expect(useChessStore.getState().isAutoPlaying).toBe(true);

    useChessStore.getState().stopAutoPlay();
    expect(useChessStore.getState().isAutoPlaying).toBe(false);

    // Si se activa de nuevo, stopAutoPlay limpia el estado
    useChessStore.setState({ isAutoPlaying: true });
    useChessStore.getState().stopAutoPlay();
    expect(useChessStore.getState().isAutoPlaying).toBe(false);
  });

  it('navega correctamente dentro de una variante sin desincronizar la partida principal', () => {
    useChessStore.setState({
      variant: {
        active: true,
        label: 'Prueba de variante',
        originPly: 0,
        originFen: START_FEN,
        uciMoves: ['e2e4', 'e7e5'],
        sanMoves: ['e4', 'e5'],
        fens: [START_FEN, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'],
        stepIndex: 1,
      },
    });

    useChessStore.getState().stepVariant(1);
    expect(useChessStore.getState().variant?.stepIndex).toBe(2);

    useChessStore.getState().stepVariant(-1);
    expect(useChessStore.getState().variant?.stepIndex).toBe(1);

    useChessStore.getState().exitVariant();
    expect(useChessStore.getState().variant).toBeNull();
  });

  it('desactiva y limpia las formas de señalización (customHighlightShapes) al cambiar de modo de juego', async () => {
    // Señalizar una jugada en el tablero
    useChessStore.getState().setCustomHighlightShapes([
      { orig: 'e2', dest: 'e4', brush: 'green' },
      { orig: 'e2', brush: 'yellow' },
    ]);
    expect(useChessStore.getState().customHighlightShapes.length).toBe(2);

    // Al cambiar de modo a desafío o cualquier otro, debe limpiarse
    await useChessStore.getState().setMode('challenge');
    expect(useChessStore.getState().customHighlightShapes).toEqual([]);

    // En modo sin ayuda durante la partida, selectActiveBoardShapes no debe mostrar ayudas
    useChessStore.getState().setCustomHighlightShapes([{ orig: 'd2', dest: 'd4', brush: 'green' }]);
    const shapesNoAid = selectActiveBoardShapes({
      ...useChessStore.getState(),
      mode: 'no_aid',
      gameOver: false,
    });
    expect(shapesNoAid).toEqual([]);

    // Y permite limpiarlas explícitamente a través de setCustomHighlightShapes([])
    useChessStore.getState().setCustomHighlightShapes([]);
    expect(useChessStore.getState().customHighlightShapes).toEqual([]);
  });

  it('calcula piezas capturadas correctamente (getCapturedPieces)', () => {
    const startChess = new Chess();
    const initCaptured = getCapturedPieces(startChess);
    expect(initCaptured.capturedByWhite.p).toBe(0);
    expect(initCaptured.capturedByBlack.p).toBe(0);

    // Posición tras 1. e4 d5 2. exd5 (peón negro de d5 capturado por blancas)
    const afterCaptureChess = new Chess('rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2');
    const res = getCapturedPieces(afterCaptureChess);
    expect(res.capturedByWhite.p).toBe(1);
    expect(res.capturedByBlack.p).toBe(0);
  });

  it('permite alternar el sombreado de jugadas con flechas (toggleMoveHighlightArrow)', () => {
    const s = useChessStore.getState();
    s.setCustomHighlightShapes([]);
    expect(s.customHighlightShapes.length).toBe(0);

    // Sombrear e2->e4
    s.toggleMoveHighlightArrow('e2', 'e4', 'blue');
    expect(useChessStore.getState().customHighlightShapes.length).toBe(1);
    expect(useChessStore.getState().customHighlightShapes[0]).toEqual({
      orig: 'e2',
      dest: 'e4',
      brush: 'blue',
    });

    // Al volver a sombrear la misma jugada, se desactiva
    s.toggleMoveHighlightArrow('e2', 'e4', 'blue');
    expect(useChessStore.getState().customHighlightShapes.length).toBe(0);
  });

  it('aplica ritmos de tiempo rápidos estilo Chess.com (applyTimeControlPreset)', () => {
    const s = useChessStore.getState();

    s.applyTimeControlPreset('bullet_1_1');
    expect(useChessStore.getState().clockEnabled).toBe(true);
    expect(useChessStore.getState().clockInitialMinutes).toBe(1);
    expect(useChessStore.getState().clockIncrementSeconds).toBe(1);

    s.applyTimeControlPreset('blitz_3_0');
    expect(useChessStore.getState().clockEnabled).toBe(true);
    expect(useChessStore.getState().clockInitialMinutes).toBe(3);
    expect(useChessStore.getState().clockIncrementSeconds).toBe(0);

    s.applyTimeControlPreset('rapid_10_0');
    expect(useChessStore.getState().clockEnabled).toBe(true);
    expect(useChessStore.getState().clockInitialMinutes).toBe(10);
    expect(useChessStore.getState().clockIncrementSeconds).toBe(0);

    s.applyTimeControlPreset('none');
    expect(useChessStore.getState().clockEnabled).toBe(false);
  });

  it('todos los niveles cuentan con personalidad de Bot, avatar, elo y título', () => {
    expect(LEVELS.length).toBe(9);
    for (const lvl of LEVELS) {
      expect(lvl.botName).toBeTruthy();
      expect(lvl.botTitle).toBeTruthy();
      expect(lvl.botAvatar).toBeTruthy();
      expect(lvl.botElo).toBeGreaterThan(100);
      expect(lvl.botQuote).toBeTruthy();
    }
    expect(LEVELS[0].botName).toBe('Martín');
    expect(LEVELS[0].botElo).toBe(250);
    expect(LEVELS[2].botName).toBe('Nelson');
    expect(LEVELS[2].botElo).toBe(1300);
    expect(LEVELS[7].botName).toBe('Magnus Bot');
    expect(LEVELS[7].botElo).toBe(2800);
  });

  it('PostGameReportView renderiza acordeones, chips de errores clave y barra inferior sticky', () => {
    const mockReport: any = {
      result: '1-0',
      reasonText: 'Por jaque mate',
      playerColor: 'w',
      totalPlies: 12,
      totalFullMoves: 6,
      playerMoveCount: 6,
      goodMovesTotal: 4,
      accuracyPercent: 78,
      averageCpLoss: 35,
      whiteStats: {
        accuracyPercent: 78,
        averageCpLoss: 35,
        goodMovesTotal: 4,
        moveCount: 6,
        counts: { brillante: 0, excelente: 1, mejor: 2, buena: 1, libro: 0, imprecision: 1, error: 1, error_grave: 0 },
      },
      blackStats: {
        accuracyPercent: 62,
        averageCpLoss: 72,
        goodMovesTotal: 2,
        moveCount: 6,
        counts: { brillante: 0, excelente: 0, mejor: 1, buena: 1, libro: 0, imprecision: 1, error: 2, error_grave: 1 },
      },
      criticalMoment: {
        ply: 5,
        moveNumber: 3,
        mover: 'w',
        playedSanEs: 'd4',
        whatHappened: 'Apertura central buscando iniciativa en el centro del tablero.',
        classification: { category: 'buena', meta: { label: 'Buena', symbol: '👍', color: '#10b981' } },
      },
      mainMistake: {
        ply: 9,
        moveNumber: 5,
        mover: 'w',
        playedSanEs: 'Ag5',
        bestSanEs: 'O-O',
        whatHappened: 'Dejaste el caballo de f3 con menor defensa.',
        classification: { category: 'error', meta: { label: 'Error', symbol: '⚠️', color: '#f59e0b' } },
      },
      criticalMistakes: [
        {
          ply: 9,
          moveNumber: 5,
          mover: 'w',
          playedSanEs: 'Ag5',
          bestSanEs: 'O-O',
          whatHappened: 'Dejaste el caballo de f3 con menor defensa.',
          classification: { category: 'error', meta: { label: 'Error', symbol: '⚠️', color: '#f59e0b' } },
        },
      ],
      bestMoves: [],
      missedOpportunities: [],
      decisiveMoments: [],
      strengths: ['Control inicial del centro'],
      strategicIssues: [],
      methodologyNote: 'Calculado con Stockfish 19',
      trainingPlan: {
        topThreeWeaknesses: [],
        conceptsToStudy: [],
        nextGameObjectives: [],
        recommendedPuzzles: [],
        verificationChallenge: { title: 'Comprueba tu táctica', prompt: 'Encuentra la mejor respuesta.' },
      },
    };

    useChessStore.setState({ postGameReport: mockReport });
    const html = renderToString(<PostGameReportView />);

    expect(html).toContain('Resultado:');
    expect(html).toContain('1-0');
    expect(html).toContain('78%');
    expect(html).toContain('62%');
    expect(html).toContain('Errores clave:');
    expect(html).toContain('J5');
    expect(html).toContain('Momento más crítico');
    expect(html).toContain('Principal error cometido');
    expect(html).toContain('Estadísticas de la partida');
    expect(html).toContain('Clasificación de jugadas (Blancas vs Negras)');
    expect(html).toContain('report-sticky-bottom-bar');
    expect(html).toContain('Practica tus fallos en el tablero');
  });

  it('fusiona Momento crítico y Principal error cuando hacen referencia a la misma jugada', () => {
    const mockReportMerged: any = {
      result: '0-1',
      reasonText: 'Por abandono',
      playerColor: 'w',
      totalPlies: 10,
      totalFullMoves: 5,
      playerMoveCount: 5,
      goodMovesTotal: 3,
      accuracyPercent: 65,
      averageCpLoss: 80,
      criticalMoment: {
        ply: 7,
        moveNumber: 4,
        mover: 'w',
        playedSanEs: 'Cxe5',
        whatHappened: 'Captura precipitada que pierde material.',
        classification: { category: 'error_grave', meta: { label: 'Error grave', symbol: '❌', color: '#ef4444' } },
      },
      mainMistake: {
        ply: 7,
        moveNumber: 4,
        mover: 'w',
        playedSanEs: 'Cxe5',
        bestSanEs: 'd3',
        whatHappened: 'Captura precipitada que pierde material.',
        classification: { category: 'error_grave', meta: { label: 'Error grave', symbol: '❌', color: '#ef4444' } },
      },
      criticalMistakes: [],
      bestMoves: [],
      missedOpportunities: [],
      decisiveMoments: [],
      strengths: [],
      strategicIssues: [],
      methodologyNote: 'Calculado con Stockfish 19',
      trainingPlan: {
        topThreeWeaknesses: [],
        conceptsToStudy: [],
        nextGameObjectives: [],
        recommendedPuzzles: [],
        verificationChallenge: { title: 'Desafío', prompt: 'Resolver.' },
      },
    };

    useChessStore.setState({ postGameReport: mockReportMerged });
    const html = renderToString(<PostGameReportView />);

    expect(html).toContain('Momento crítico y principal error');
    expect(html).toContain('Misma jugada decisiva');
    expect(html).toContain('Cxe5');
    expect(html).toContain('d3');
  });

  it('TruncatedExplanation renderiza botón de alternancia para textos extensos', () => {
    const shortText = 'Jugada sólida.';
    const shortHtml = renderToString(<TruncatedExplanation text={shortText} maxLen={50} />);
    expect(shortHtml).not.toContain('Ver más');

    const longText = 'Esta es una explicación sumamente detallada que describe cómo las piezas blancas crearon una debilidad crítica en el flanco de dama con varias frases explicativas.';
    const longHtml = renderToString(<TruncatedExplanation text={longText} maxLen={40} />);
    expect(longHtml).toContain('Ver más');
  });

  it('toggleVisualOption("showVisualAids") activa y desactiva las flechas de guía inmediatamente y limpia formas', () => {
    useChessStore.setState({
      showVisualAids: true,
      showBestMoveArrow: true,
      showThreatArrows: true,
      customHighlightShapes: [{ orig: 'e2', dest: 'e4', brush: 'green' }],
    });

    // Al desactivar flechas guía:
    useChessStore.getState().toggleVisualOption('showVisualAids');
    const stateOff = useChessStore.getState();
    expect(stateOff.showVisualAids).toBe(false);
    expect(stateOff.showBestMoveArrow).toBe(false);
    expect(stateOff.showThreatArrows).toBe(false);
    expect(stateOff.customHighlightShapes).toEqual([]);
    expect(selectActiveBoardShapes(stateOff)).toEqual([]);

    // Al reactivar flechas guía:
    useChessStore.getState().toggleVisualOption('showVisualAids');
    const stateOn = useChessStore.getState();
    expect(stateOn.showVisualAids).toBe(true);
    expect(stateOn.showBestMoveArrow).toBe(true);
    expect(stateOn.showThreatArrows).toBe(true);
  });

  it('selectActiveBoardShapes muestra flecha direccional al consultar jugadas del historial y respeta customHighlightShapes', () => {
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const fenAfterE5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    const state = {
      ...useChessStore.getState(),
      showVisualAids: true,
      mode: 'normal' as const,
      gameOver: false,
      moves: [
        { ply: 1, moveNumber: 1, color: 'w' as const, uci: 'e2e4', san: 'e4', sanEs: 'e4', fenBefore: START_FEN, fenAfter: fenAfterE4 },
        { ply: 2, moveNumber: 1, color: 'b' as const, uci: 'e7e5', san: 'e5', sanEs: 'e5', fenBefore: fenAfterE4, fenAfter: fenAfterE5 },
      ],
      fens: [START_FEN, fenAfterE4, fenAfterE5],
      viewingPly: 1,
      moveEvaluations: {},
      customHighlightShapes: [],
    };

    // Al consultar la jugada 1 del historial (e2 -> e4)
    const shapes = selectActiveBoardShapes(state as any);
    expect(shapes.length).toBe(1);
    expect(shapes[0].orig).toBe('e2');
    expect(shapes[0].dest).toBe('e4');
    expect(shapes[0].brush).toBe('blue');

    // Con custom shapes (ej. señaladas por el usuario o por Ver en tablero)
    const stateWithCustom = {
      ...state,
      customHighlightShapes: [{ orig: 'd2', dest: 'd4', brush: 'green' as const }],
    };
    const shapesCustom = selectActiveBoardShapes(stateWithCustom as any);
    expect(shapesCustom.some((s) => s.orig === 'd2' && s.dest === 'd4')).toBe(true);
  });
});

