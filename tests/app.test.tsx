import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { TrainingLabPanel } from '../src/components/TrainingLabPanel';
import {
  useChessStore,
  selectActiveBoardShapes,
  savePersistedSession,
  loadPersistedSession,
  clearPersistedSession,
} from '../src/state/useChessStore';
import { START_FEN } from '../src/chess/utils';

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
});

